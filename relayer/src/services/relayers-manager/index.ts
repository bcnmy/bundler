import { Network } from 'network-sdk';
import { RawTransactionType } from 'network-sdk/dist/types';
import { Mutex } from 'async-mutex';
import { BigNumber, ethers } from 'ethers';
import { RelayerManagerMessenger } from 'gasless-messaging-sdk';
import { config, configChangeListeners } from '../../../config';
import { logger } from '../../../../common/log-config';
import { DaoUtils } from '../../dao-utils';
import { redisClient } from '../../../../common/db';
import { getTransactionDataKey } from '../../utils/cache-utils';
import { stringify } from '../../utils/util';
import { Relayer } from '../relayers';
import { Transaction } from '../transaction';
import { startPendingTransactionListener } from './pending-tx-listener';
import { RelayerPriorityQueue } from './relayer-priority-queue';

const log = logger(module);
const fundRelayerMutex = new Mutex();
const createRelayerMutex = new Mutex();

const { gasLimit: gasLimitMap, relayerFundingAmount } = config.relayerService;
const { BICONOMY_OWNER_ADDRESS = '', BICONOMY_OWNER_PRIVATE_KEY = '' } = process.env;

enum RelayersStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',

}

export class RelayerManager {
  network: Network;

  networkId: number;

  messenger: RelayerManagerMessenger;

  relayersMap: Record<string, Relayer> = {};

  relayerPriorityQueue: RelayerPriorityQueue;

  retryCountMap: Record<string, number> = {}; // store retry count corresponding to transaction id

  inactiveRelayerBalanceThreshold: BigNumber = ethers.utils.parseEther('0.10');

  minimumRelayerCount: number = 15;

  maximumRelayerCount: number = 100;

  newRelayerInstanceCreated: number = 5;

  RELAYER_CAPACITY_THRESHHOLD: number = 0.6; // 60% of total assigned relayers in queue

  // Could maintain this
  /** @property number of transactions sent by main account */
  mainAccountNonce: number = 0;

  connection: any;

  daoUtilsInstance: DaoUtils;

  constructor(
    network: Network,
    networkId: number,
    messenger: RelayerManagerMessenger,
    connection: any,
    daoUtilsInstance: DaoUtils,
  ) {
    this.network = network;
    this.networkId = networkId;
    this.messenger = messenger;
    this.connection = connection;
    this.daoUtilsInstance = daoUtilsInstance;
    startPendingTransactionListener(this.networkId, this.retryTransaction.bind(this));

    configChangeListeners.relayerManagerService.push(this.onConfigChange.bind(this));

    this.relayerPriorityQueue = new RelayerPriorityQueue();
  }

  onConfigChange(uconfig: any) {
    this.minimumRelayerCount = uconfig.relayerManagerService.minimumRelayerCount;
    const extraRelayersToSpinUp = this.minimumRelayerCount - this.getRelayersCount();
    if (extraRelayersToSpinUp > 0) {
      this.createRelayers(extraRelayersToSpinUp);
    }
  }

  onRelayerActivate() {
    const totalRelayersCount = this.getRelayersCount();
    const activeRelayersCount = this.getRelayersCount(RelayersStatus.ACTIVE);
    log.info(`Total relayer count ${totalRelayersCount} and active relayer count ${activeRelayersCount} on network id ${this.networkId}`);
  }

  onRelayerDeactivate() {
    const totalRelayersCount = this.getRelayersCount(); // fetches total account
    const inactiveRelayersCount = this.getRelayersCount(RelayersStatus.INACTIVE);

    const threshold = Math.floor(
      totalRelayersCount * this.RELAYER_CAPACITY_THRESHHOLD,
    );

    log.info(`Inactive relayer count is ${inactiveRelayersCount} and threshold is ${threshold} with total relayer created till now as ${totalRelayersCount} on network id ${this.networkId}`);

    // check if relayer
    if (totalRelayersCount < this.maximumRelayerCount && inactiveRelayersCount >= threshold) {
      log.info(`Creating new relayer due to high load on network id ${this.networkId}`);
      this.createRelayers(this.newRelayerInstanceCreated);
    }
  }

  // 0x7979b50486fe342a63409f0149ef33fd3bdaa92e - new relayer
  async onRelayerRequestingFunds(address: string) {
    await this.fundRelayer(address);
  }

  async fetchMainAccountNonceFromNetwork() {
    const nonce = await this.network.getNonce(BICONOMY_OWNER_ADDRESS, true);
    log.info(`Main account nonce is ${nonce} on network id ${this.networkId}`);
    return nonce;
  }

  async getMainAccountNonce() {
    return this.mainAccountNonce;
  }

  async createRelayers(defaultNoOfRelayer: number) {
    log.info(`Waiting for lock to create relayers on ${this.networkId}`);
    const release = await createRelayerMutex.acquire();
    log.info(`Received lock to create relayers on ${this.networkId}`);

    try {
      if (!this.mainAccountNonce) {
        this.mainAccountNonce = await this.fetchMainAccountNonceFromNetwork();
      }

      const promises = [];
      for (let x = 1; x <= defaultNoOfRelayer; x += 1) {
        const index = this.getRelayersCount() + x;
        const relayer = new Relayer(
          index,
          this.network,
          this.networkId,
          this.connection, // rabbitmq connection
          this.daoUtilsInstance,
          this.onRelayerActivate.bind(this),
          this.onRelayerDeactivate.bind(this),
          this.onRelayerRequestingFunds.bind(this),
        );
        promises.push(relayer.create(this.messenger));
      }
      const relayers: Relayer[] = await Promise.all(promises);

      log.info(`Relayers created on network id ${this.networkId}`);
      relayers.map(async (relayer) => {
        const relayerAddress = relayer.address.toLowerCase();
        this.relayersMap[relayerAddress] = relayer;
        await this.fundRelayer(relayerAddress);

        await this.relayersMap[relayerAddress].createChannel();
      });
    } catch (error) {
      console.log(error);
      log.error(`failed to create relayers ${stringify(error)} on network id ${this.networkId}`);
    }

    release();
    log.info(`Lock released after creating relayers on ${this.networkId}`);
  }

  async fundRelayer(address: string) {
    try {
      // check funding threshold
      if (!this.hasBalanceBelowThreshold(address)) {
        log.info(`Has sufficient funds in relayer ${address} on network id ${this.networkId}`);
        return;
      }
      const release = await fundRelayerMutex.acquire();

      log.info(`Funding relayer ${address} on network id ${this.networkId}`);

      let gasLimitIndex = 0;
      // different gas limit for arbitrum
      if ([42161, 421611].includes(this.networkId)) gasLimitIndex = 1;

      const gasLimit = gasLimitMap[gasLimitIndex].toString();
      // fetch gas price
      const { gasPrice } = await this.network.getGasPrice();

      const mainAccountNonce = await this.getMainAccountNonce();

      const rawTx: RawTransactionType = {
        from: BICONOMY_OWNER_ADDRESS,
        gasPrice: ethers.BigNumber.from(
          gasPrice.toString(),
        ).toHexString(),
        gasLimit: ethers.BigNumber.from(
          gasLimit.toString(),
        ).toHexString(),
        to: address,
        value: ethers
          .utils.parseEther(relayerFundingAmount[this.networkId].toString()).toHexString(),
        nonce: ethers.BigNumber.from(
          mainAccountNonce.toString(),
        ).toHexString(),
        chainId: this.networkId,
      };
      log.info(`Funding relayer ${address} on network id ${this.networkId} with raw tx ${stringify(rawTx)}`);
      const transaction = new Transaction({
        rawTransaction: rawTx,
        fromAddress: BICONOMY_OWNER_ADDRESS,
        privateKey: BICONOMY_OWNER_PRIVATE_KEY,
        networkId: this.networkId,
      }, this.network);
      const response: any = await transaction.execute();
      if (response.nonce) {
        this.mainAccountNonce = response.nonce + 1;
      }
      release();
      const { hash, error } = response;
      if (hash) {
        log.info(`Hash from funding relayer ${address} is ${hash} on network id ${this.networkId}`);
        this.listenForTransactionStatus(hash);
      } else if (error) {
        log.error(`Unable to fund relayer ${address} due to ${error} on network id ${this.networkId}`);
      }
    } catch (error) {
      log.error(`Error in fundRelayer ${stringify(error)}`);
    }
  }

  // transaction listner for relayer funding
  async listenForTransactionStatus(hash: string) {
    const provider = this.network.getProvider();
    const transaction: any = await provider.waitForTransaction(hash);
    if (transaction.status) {
      const relayerAddress = transaction.to.toLowerCase();
      const relayer = this.relayersMap[relayerAddress];
      log.info(`Relayer address ${relayer.address} is funded on network id ${this.networkId}`);
      if (!relayer.activeStatus()) {
        log.info(`Relayer address ${relayer.address} is being activated on network id ${this.networkId}`);
        // activate the relayer
        relayer.setStatus(true);
        // allow to consume from the queue
        relayer.startConsumptionFromQueue();
      }
    }
  }

  getRelayersCount(filter?: RelayersStatus): number {
    const relayerAddresses = Object.keys(this.relayersMap);
    if (filter === RelayersStatus.ACTIVE) {
      return relayerAddresses.filter(
        (address) => this.relayersMap[address].activeStatus() === true,
      ).length;
    }

    if (filter === RelayersStatus.INACTIVE) {
      return relayerAddresses.filter(
        (address) => this.relayersMap[address].activeStatus() === false,
      ).length;
    }

    return relayerAddresses.length;
  }

  // Should this be called on each relayer manager?
  async stopServer() {
    const relayerAddresses = Object.keys(this.relayersMap);
    let relayerPendingCountZero = true;
    for (const relayerAddress of relayerAddresses) {
      const relayer = this.relayersMap[relayerAddress];

      // eslint-disable-next-line no-await-in-loop
      await relayer.pauseConsumptionFromQueue();
      // wait for all the relayers pending count to reach zero
      if (relayer.pendingTransactionCount) {
        relayerPendingCountZero = false;
      }
    }
    if (!relayerPendingCountZero) {
      setTimeout(() => {
        this.stopServer();
      }, 5000);
    }
  }

  hasBalanceBelowThreshold(address: string) {
    const relayerBalance = this.relayersMap[address].balance;
    const relayerMinimumBalanceThreshold = config
      .relayerService
      .relayerMinimumBalanceThreshold[this.networkId];

    const thresholdInWei = ethers.utils.parseEther(
      relayerMinimumBalanceThreshold.toString(),
    );
    log.info(`Balance of relayer ${address} is ${relayerBalance} and threshold is ${thresholdInWei}`);
    return relayerBalance.lte(thresholdInWei);
  }

  // retry transaction
  async retryTransaction(transactionId: string, transactionData: any) {
    try {
      // Check if transaction is confirmed already
      const receipt = await this.network.getTransactionReceipt(transactionData.hash);
      if (transactionData.relayerAddress && !receipt) {
        const relayer = this.relayersMap[transactionData.relayerAddress.toLowerCase()];

        this.retryCountMap[transactionId] = this.retryCountMap[transactionId]
          ? this.retryCountMap[transactionId] + 1
          : 1;
        const retryCountForTransactionId = this.retryCountMap[transactionId];

        if (retryCountForTransactionId >= 5) {
          try {
            // delete data key
            await redisClient.del(getTransactionDataKey(transactionId));
          } catch (err) {
            log.error(`error occured in slack notify or redis cache delete ${stringify(err)} on network id ${this.networkId}`);
          }
        } else {
          // send transaction for retry
          try {
            const response = await relayer.sendTransaction(
              transactionData,
              this.retryCountMap[transactionId], // retryCount
            );

            if (!response.error) {
              log.info(`Transaction Id:- ${transactionId} sent after ${retryCountForTransactionId} retry from relayer address ${transactionData.relayerAddress} with transaction hash as ${response.hash} on network id ${this.networkId}`);
            }
          } catch (err) {
            log.error(`error occured in retry ${stringify(err)}`);
          }
        }
      } else {
        log.info(`did not retry ${transactionId} with transaction hash ${transactionData.hash} as receipt found on network id ${this.networkId}`);
      }
    } catch (error) {
      log.error(error);
    }
  }

  getNextRelayer(): Relayer {
    // short-term solution
    let bestRelayer = this.relayersMap[Object.keys(this.relayersMap)[0]];

    for (const relayerAddress in this.relayersMap) {
      const relayer = this.relayersMap[relayerAddress];

      if (bestRelayer === undefined) {
        bestRelayer = relayer;
      }
      else if (relayer.balance > bestRelayer.balance &&
        relayer.pendingTransactionCount < bestRelayer.pendingTransactionCount) {
        bestRelayer = relayer;
        break;
      }
    };

    return bestRelayer;

    // TODO: proper implementation
    // return this.relayerPriorityQueue.pop();
  }
}
