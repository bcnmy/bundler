import { privateToPublic, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import hdkey from 'hdkey';
import { Network } from 'network-sdk';
import { hostname } from 'os';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { TransactionStatus } from '../../common/types';
import { DaoUtils } from '../../dao-utils';
import {
  getGasPriceKey, getTransactionDataKey, getTransactionKey
} from '../../utils/cache-utils';
import { getNativeTokenPriceInUSD } from '../../utils/native-token-price';
import { stringify } from '../../utils/util';
import { Transaction } from '../transaction';

const log = logger(module);

const relayersMasterSeed = config.relayerService.masterSeed;
const nodePathRoot = "m/44'/60'/0'/";

export class Relayer {
  /** @property index value of relayer created by relayer manager */
  id: number;

  /** @property public address of the relayer to relay the transaction from */
  address: string = '';

  /** @property public key of the relayer which can be used while sending the transaction */
  private publicKey: string = '';

  /** @property private key of the relayer to be used while sending the transaction */
  private privateKey: string = '';

  /** @property status of the relayer */
  private active: boolean = false;

  /** @property number of transactions sent by the relayer */
  nonce: number = 0;

  /** @property balance of the relayer */
  balance: ethers.BigNumber = ethers.utils.parseEther('0');

  /** @property minimum balance required in the relayer */
  // TODO
  // Get threshold from config
  private balanceThreshold: ethers.BigNumber = ethers.utils.parseEther('0.197');

  /** @property network instance to which the relayer belongs */
  network: Network;

  /** @property retry count of a particular transaction id */
  retryCount: any;

  /** @property minimum balance required in the relayer */
  networkId: number;

  /** @property RelayerMessenger */
  messenger: any;

  /** @property maintains the count of pending transaction */
  pendingTransactionCount: number;

  pendingTransactionCountThreshold: number = 15;

  onRelayerActivate: () => void;

  onRelayerDeactivate: () => void;

  onRelayerRequestingFunds: (address: string) => void;

  queue: any;

  channel: any;

  consumerTag: string = '';

  rabbitmqConnection: any;

  daoUtilsInstance: DaoUtils;

  constructor(
    relayerId: number,
    network: Network,
    networkId: number,
    connection: any, // rabbitmq connection
    daoUtilsInstance: DaoUtils,
    onRelayerActivate: () => void,
    onRelayerDeactivate: () => void,
    onRelayerRequestingFunds: (address: string) => void,
  ) {
    this.id = relayerId;
    this.active = true;
    this.network = network;
    this.networkId = networkId;
    this.rabbitmqConnection = connection;
    this.daoUtilsInstance = daoUtilsInstance;
    this.pendingTransactionCount = 0;
    this.onRelayerActivate = onRelayerActivate;
    this.onRelayerDeactivate = onRelayerDeactivate;
    this.onRelayerRequestingFunds = onRelayerRequestingFunds;
  }

  static async removeRetry(transactionId: string) {
    await redisClient.del(getTransactionDataKey(transactionId));
    await redisClient.del(getTransactionKey(transactionId));
  }

  static bumpGasPrice(gasPrice: string, percent: number) {
    const gasPriceInInt = parseInt(gasPrice, 16);
    const bumpedGasPrice = gasPriceInInt + parseInt((gasPriceInInt * (percent / 100)
    ).toString(), 10);
    return ethers.utils.hexValue(bumpedGasPrice);
  }

  /**
   * Creates relayer and sets the balance, nonce property via rpc call.
   * It also sets up a channel for relaying the transaction.
   */
  async create(managerMessenger: RelayerManagerMessenger) {
    if (!relayersMasterSeed) throw new Error('provide relayers master seed');

    const seedInBuffer = Buffer.from(relayersMasterSeed, 'utf-8');
    const ethRoot = hdkey.fromMasterSeed(seedInBuffer);

    const { nodePathIndex } = config.relayerService;

    const nodePath = `${nodePathRoot + nodePathIndex}/`;
    const ethNodePath: any = ethRoot.derive(nodePath + this.id);
    const privateKey = ethNodePath._privateKey.toString('hex');
    const ethPubkey = privateToPublic(ethNodePath.privateKey);

    const ethAddr = publicToAddress(ethPubkey).toString('hex');
    const ethAddress = toChecksumAddress(`0x${ethAddr}`);
    this.address = ethAddress.toLowerCase();
    this.messenger = managerMessenger.getRelayerMessenger(this.address);

    this.publicKey = ethPubkey.toString();
    this.privateKey = privateKey.toLowerCase();

    await this.setBalance();
    await this.setNonce();
    await this.setPendingCount();

    return this;
  }

  async createChannel() {
    this.channel = await this.rabbitmqConnection.createChannel();
    const exchange = config.relayerService.queueExchange;

    this.channel.assertExchange(exchange, 'topic', {
      durable: true,
    });
    this.channel.prefetch(1);

    try {
      // setup a consumer
      this.queue = await this.channel.assertQueue(`relayer_queue_${this.networkId}`);
      const key = `networkid.${this.networkId}`;
      log.info(`[*] Waiting for transactions on ${this.address} on network id ${this.networkId}`);
      this.channel.bindQueue(this.queue.queue, exchange, key);

      this.startConsumptionFromQueue();
    } catch (error) {
      console.error(error);
    }
  }

  activeStatus() {
    return this.active;
  }

  setStatus(status: boolean) {
    this.active = status;
  }

  async setBalance() {
    this.balance = (await this.network.getBalance(this.address));
  }

  async setNonce() {
    // if (localUpdate && !this.nonce) this.nonce += 1;
    this.nonce = await this.network.getNonce(this.address, true);
  }

  async getGasPrice() {
    let gasPrice;
    const gasPriceFromCache = await redisClient.get(getGasPriceKey(this.networkId));
    log.info(`Gas price for ${this.networkId} in cache is ${gasPriceFromCache} on network id ${this.networkId}`);
    if (gasPriceFromCache) {
      gasPrice = ethers.utils.hexValue(Number(gasPriceFromCache));
    } else {
      gasPrice = (await this.network.getGasPrice()).gasPrice;
      log.info(`Gas price for ${this.networkId} from network is ${gasPriceFromCache} on network id ${this.networkId}`);
    }
    return gasPrice;
  }

  async setPendingCount() {
    const latestCount = await this.network.getNonce(this.address, false);
    const pendingCount = await this.network.getNonce(this.address, true);
    const diff = pendingCount - latestCount;
    this.pendingTransactionCount = diff > 0 ? diff : 0;
  }

  async sendTransaction(rawTransactionData: any, retryCount: number = 0) {
    if (!this.active) {
      return {
        error: 'relayer not active',
      };
    }
    let transactionResponse: any;
    const retryTransaction: boolean = retryCount > 0;
    const {
      gasLimit, to, destinationData: data, transactionId, value,
    } = rawTransactionData;

    let gasPriceToUse;
    let previousTransactionHash;
    let nonceToUse = this.nonce.toString();

    if (retryTransaction) {
      const { gasPrice, nonce, hash } = rawTransactionData;
      // increment gas price by atleast 10 percent
      gasPriceToUse = Relayer.bumpGasPrice(
        gasPrice,
        config.bumpGasPrice[this.networkId] || 10,
      );
      nonceToUse = nonce;
      previousTransactionHash = hash;
      log.info(`Transaction retried with bumped gas price of ${gasPriceToUse} and nonce is ${nonceToUse} on network id ${this.networkId}`);
    } else {
      gasPriceToUse = await this.getGasPrice();
    }
    log.info(`Transaction Id:- ${transactionId} sent with gas price of ${gasPriceToUse} and nonce as ${nonceToUse} on network id ${this.networkId}`);

    const nonceForTransaction = ethers.BigNumber.from(nonceToUse).toHexString();
    try {
      const transactionData = {
        gasPrice: gasPriceToUse,
        gasLimit,
        to,
        value: ethers.BigNumber.from('0').toHexString(),
        data,
        chainId: this.networkId,
        nonce: nonceForTransaction,
      };
      log.info(`Transaction Id:- ${transactionId} sent with data ${stringify(transactionData)}`);

      const transaction = new Transaction({
        rawTransaction: transactionData,
        fromAddress: this.address,
        privateKey: this.privateKey,
        networkId: this.networkId,
      }, this.network, 3);
      transactionResponse = await transaction.execute();

      if (!transactionResponse.error) {
        await this.setBalance();
        this.waitForTransactionResponse(
          transactionId,
          transactionResponse,
          retryTransaction, // true if retry count greater than 0 else false
          previousTransactionHash,
        );
        if (transactionResponse.nonce) {
          this.nonce = transactionResponse.nonce + 1;
        }

        // add data to cache for retry service
        const transactionKey = getTransactionKey(transactionId);
        const transactionKeyExpiry = config
          .relayerService.txnHashKeyExpiryTimePerNetwork[this.networkId];
        log.info(`adding ${transactionKey} with expiry ${transactionKeyExpiry} in redis on network id ${this.networkId}`);
        await redisClient.set(transactionKey, '1');
        await redisClient.expire(
          transactionKey,
          transactionKeyExpiry,
        );
        const cacheData = {
          ...rawTransactionData,
          gasPrice: gasPriceToUse,
          nonce: transactionResponse.nonce,
          hash: transactionResponse.hash,
          relayerAddress: transactionResponse.from,
        };
        await redisClient.set(
          getTransactionDataKey(transactionId),
          stringify(cacheData),
        );

        // save transaction to db
        const currentTimeInMs = Date.now();
        try {
          log.info(`saving data in db for transaction id ${transactionId}`);
          if (retryTransaction) {
            const previousTransactoinDataFromDB: any = await this.daoUtilsInstance.getTransaction({
              transactionHash: previousTransactionHash,
            }, this.networkId);

            if (!previousTransactoinDataFromDB.error) {
              const retryTransactionData = {
                transactionId,
                transactionHash: transactionResponse.hash,
                previousTransactionHash,
                status: TransactionStatus.PENDING,
                metaTxData: previousTransactoinDataFromDB.metaTxData,
                metaTxApproach: previousTransactoinDataFromDB.metaTxApproach,
                rawTransaction: previousTransactoinDataFromDB.rawTransaction,
                apiId: previousTransactoinDataFromDB.apiId,
                apiName: previousTransactoinDataFromDB.apiName,
                networkId: this.networkId,
                gasPrice: gasPriceToUse,
                dappId: previousTransactoinDataFromDB.dappId,
                receipt: {},
                relayerAddress: previousTransactoinDataFromDB.relayerAddress,
                signerAddress: previousTransactoinDataFromDB.signerAddress,
                transactionFee: 0,
                transactionFeeCurrency:
                  previousTransactoinDataFromDB.transactionFeeCurrency, // for now
                baseCurrencyInFiat: previousTransactoinDataFromDB.baseCurrencyInFiat,
                transactionFeeInFiat: 0,
                transactionFeeInFiatCurrency:
                  previousTransactoinDataFromDB.transactionFeeInFiatCurrency,
                retryCount,
                creationTime: currentTimeInMs,
                updationTime: currentTimeInMs,
                ipAddress: previousTransactoinDataFromDB.ipAddress,
              };
              await this.daoUtilsInstance.saveTransaction(this.networkId, retryTransactionData);
            }
          } else {
            const transactionDataInDB = {
              transactionHash: transactionResponse.hash,
              status: TransactionStatus.PENDING,
              rawTransaction: {
                gasPrice: gasPriceToUse,
                gasLimit,
                to,
                value,
                data,
                nonce: nonceForTransaction,
                chainId: this.networkId,
              },
              relayerAddress: this.address,
              transactionFee: 0,
              transactionFeeCurrency: config.currency[this.networkId],
              baseCurrencyInFiat: 0,
              transactionFeeInFiat: 0,
              transactionFeeInFiatCurrency: config.fiatCurrency,
              retryCount,
              updationTime: currentTimeInMs,
              ipAddress: hostname(),
              receipt: {},
            };
            await this.daoUtilsInstance.updateTransaction(
              {
                transactionId,
              },
              this.networkId,
              transactionDataInDB,
            );
          }
        } catch (error: any) {
          log.error(`error while saving data in db ${stringify(error)}`);
        }
      } else {
        // send socket event to client about error
        log.info(`Publish error to socket client via relayer ${transactionResponse.error}`);
        this.messenger.sendErrorMessage(
          transactionId,
          transactionResponse.error,
        );
      }
    } catch (error: any) {
      log.error(error);
    }
    return transactionResponse;
  }

  async onTransactionMined(tx: any) {
    const transactionFee = (parseInt(tx.receipt.effectiveGasPrice.hex, 16)
            * parseInt(tx.receipt.gasUsed.hex, 16))
            * 10 ** (-1 * config.decimal[this.networkId]);
    const baseCurrencyInFiat = await getNativeTokenPriceInUSD(this.networkId);
    const transactionFeeInFiat = transactionFee * baseCurrencyInFiat;

    const currentTimeInMs = Date.now();
    // status of the transaction would be updated by gas management service
    await this.daoUtilsInstance.updateTransaction(
      {
        transactionHash: tx.transactionHash,
      },
      this.networkId,
      {
        receipt: tx.receipt,
        baseCurrencyInFiat,
        transactionFee,
        transactionFeeInFiat,
        updationTime: currentTimeInMs,
      },
    );
    this.pendingTransactionCount -= 1;
    log.info(`onTransactionMined => Reducing pending transaction count for relayer ${this.address}. Current pending count is ${this.pendingTransactionCount} on network id ${this.networkId}`);
    this.checkBalanceBelowThreshold();
    await Promise.all([
      Relayer.removeRetry(tx.transactionId),
      this.checkPendingTransactionThreshold(),
    ]);
  }

  async onTransactionDropped(tx: any) {
    log.info(`Tx dropped message received in relayer for:\n ${stringify({
      id: tx.transactionId,
      hash: tx.transactionHash,
      relayerAddress: tx.relayerAddress,
      networkId: tx.networkId,
    })
    }`);
    // Dropped will be dealt any differently here?
    this.pendingTransactionCount -= 1;
    log.info(`onTransactionDropped => Reducing pending transaction count for relayer ${this.address}. Current pending count is ${this.pendingTransactionCount} on network id ${this.networkId}`);
    this.checkBalanceBelowThreshold();
    await Promise.all([
      Relayer.removeRetry(tx.transactionId),
      this.checkPendingTransactionThreshold(),
    ]);
  }

  async waitForTransactionResponse(
    transactionId: string,
    transactionResponse: any,
    retry?: boolean,
    previousTransactionHash?: string,
  ) {
    if (retry) {
      log.info(`Transaction Id:- ${transactionId} with new transaction hash ${transactionResponse.hash} and previous transaction hash ${previousTransactionHash} on network id ${this.networkId}`);
      try {
        await this.messenger.sendTransactionHashChanged(
          transactionId,
          transactionResponse.hash,
          this.networkId,
          {
            onDropped: async (transactionData:any) => {
              await this.onTransactionDropped(transactionData);
            },
            onMined: async (transactionData:any) => {
              await this.onTransactionMined(transactionData);
            },
          },
        );
      } catch (error) {
        log.error(`failed to sendTransactionHashChanged to socket server ${error}`);
      }
    } else {
      log.info(`Transaction Id:- ${transactionId} and transaction hash is ${transactionResponse.hash} on network id ${this.networkId}`);
      try {
        await this.messenger.sendTransactionHashGenerated(
          transactionId,
          transactionResponse.hash,
          this.networkId,
          {
            onDropped: async (transactionData:any) => {
              await this.onTransactionDropped(transactionData);
            },
            onMined: async (transactionData:any) => {
              await this.onTransactionMined(transactionData);
            },
          },
        );
      } catch (error) {
        log.error(`failed to sendTransactionHashGenerated to socket server ${error}`);
      }
    }
  }

  async startConsumptionFromQueue() {
    let response = { error: 'something went wrong' };
    await this.channel.consume(this.queue.queue, async (msg: any) => {
      const data = JSON.parse(msg.content.toString());

      this.consumerTag = msg.fields.consumerTag;
      log.info(`received a transaction to process on network id ${this.networkId}`);
      try {
        response = await this.sendTransaction(data);
      } catch (error) {
        log.error(`Error in sendTransaction ${stringify(error)} on network id ${this.networkId}`);
      }
      log.info(`Response from relayer ${stringify(response)}`);
      if (!response.error) {
        try {
          this.channel.ack(msg);
          this.pendingTransactionCount += 1;
          await this.checkPendingTransactionThreshold();
        } catch (error) {
          log.error(`error while ack msg ${stringify(error)} on network id ${this.networkId}`);
        }
      } else {
        this.channel.ack(msg);
      }
    });
    return response;
  }

  async pauseConsumptionFromQueue() {
    log.info(`paused for consumption ${this.address} of consumer tag ${this.consumerTag} on network id ${this.networkId}`);
    await this.channel.cancel(this.consumerTag);
  }

  async checkPendingTransactionThreshold() {
    /**
     * check if pending transaction count greater than threshold
     * else if relayer was inactive and activate when
     * the pending transaction count decreased below threshold
     */
    if (this.pendingTransactionCount >= this.pendingTransactionCountThreshold) {
      log.info(`relayer address ${this.address} deactivating with pending transaction count as ${this.pendingTransactionCount} and threshold as ${this.pendingTransactionCountThreshold} on network id ${this.networkId}`);
      this.active = false;
      this.onRelayerDeactivate();
      await this.pauseConsumptionFromQueue();
    } else if (!this.active
      && this.pendingTransactionCount < this.pendingTransactionCountThreshold
    ) {
      log.info(`activate relayer address ${this.address} on network id ${this.networkId}`);
      this.active = true;
      this.onRelayerActivate();
      await this.startConsumptionFromQueue();
    }
  }

  checkBalanceBelowThreshold() {
    this.onRelayerRequestingFunds(this.address);
  }

  updateBalanceThreshold(value: ethers.BigNumber) {
    this.balanceThreshold = value;
  }
}
