// gets raw transaction data from consumer
// sends it to the class based on type of transaction to execute
// a relayer gets attached to a transaction for execution
// retry this transaction if not completed -> push it to the delayed queue

import { ethers } from 'ethers';
import { config } from '../../../config';
import { logger } from '../../../../common/log-config';
import { getGasPriceKey } from '../../utils/cache-utils';

const log = logger(module);

export class TransactionManager {
  constructor() {

  }

  static bumpGasPrice(gasPrice: string, percent: number) {
    const gasPriceInInt = parseInt(gasPrice, 16);
    const bumpedGasPrice = gasPriceInInt + parseInt((gasPriceInInt * (percent / 100)
    ).toString(), 10);
    return ethers.utils.hexValue(bumpedGasPrice);
  }

  async getGasPrice() {
    // TODO get it from gasPriceMap instance
    const gasPriceFromCache = await cache.get(getGasPriceKey(this.networkId));
    log.info(`Gas price for ${this.networkId} in cache is ${gasPriceFromCache} on network id ${this.networkId}`);
    const gasPrice = ethers.utils.hexValue(Number(gasPriceFromCache));
    return gasPrice;
  }

  async execute(): Promise<any> {
    const { rawTransaction, fromAddress, privateKey } = this.params;
    let data: any;
    log.info(`executing transaction at ${Date.now()} from address ${fromAddress} on network id ${this.networkId}`);
    const networkRpcUrlsData = await redisClient.get(getNetworkRpcUrlsKey()) as string;

    const networkRpcUrls = JSON.parse(networkRpcUrlsData);
    const providers = (networkRpcUrls && networkRpcUrls[this.networkId]) || [{
      name: 'default',
      rpcUrl: this.network.networkUrl,
    }];

    for await (const provider of providers) {
      this.network.setProvider(provider.rpcUrl);
      try {
        data = await this.network.executeTransaction(
          rawTransaction,
          fromAddress,
          privateKey,
        );
        if (data) { return data; }
      } catch (error:any) {
        const tryAgain = await this.shouldRetry(error.toString());
        log.info(`status for retrying is ${tryAgain} from address ${fromAddress} on network id ${this.networkId}`);
        if (tryAgain) {
          this.incrementTry();
          log.info(`retry count is ${this.retryCount} from address ${fromAddress} on network id ${this.networkId}`);
          return await Promise.resolve(this.execute());
        }
        return {
          error: `transaction failed with error ${error.toString()} from address ${fromAddress} on network id ${this.networkId}`,
        };
      }
    }
  }

  async sendTransaction(
    relayer: IRelayer,
    rawTransactionData: ITransactionData,
  ) :Promise<SendTransactionReturnType> {
    if (!relayer.active) {
      return {
        error: 'relayer not active',
      };
    }

    const {
      gasLimit, to, data, transactionId, value, chainId,
    } = rawTransactionData;

    const retryTransaction = relayer.retryCount > 0;

    let gasPriceToUse;
    let previousTransactionHash;
    let nonceToUse = relayer.nonce.toString();

    if (retryTransaction) {
      const { gasPrice, nonce, hash } = rawTransactionData;
      // increment gas price by atleast 10 percent
      gasPriceToUse = TransactionManager.bumpGasPrice(
        gasPrice,
        config.bumpGasPrice[rawTransactionData.chainId] || 10,
      );
      nonceToUse = nonce;
      previousTransactionHash = hash;
      log.info(`Transaction retried with bumped gas price of ${gasPriceToUse} and nonce is ${nonceToUse} on network id ${this.networkId}`);
    } else {
      gasPriceToUse = await this.getGasPrice();
    }
    log.info(`Transaction Id:- ${transactionId} sent with gas price of ${gasPriceToUse} and nonce as ${nonceToUse} on network id ${chainId}`);
    const gasLimitNew = (gasLimit && gasLimit.hex) || '0xAAE60';
    log.info(`Gas limit :- ${gasLimitNew}`);
    const nonceForTransaction = ethers.BigNumber.from(nonceToUse).toHexString();
    try {
      const transactionData = {
        gasPrice: gasPriceToUse,
        gasLimit: gasLimitNew,
        to,
        value: ethers.BigNumber.from('0').toHexString(),
        data,
        chainId,
        nonce: nonceForTransaction,
      };
      log.info(`Transaction Id:- ${transactionId} sent with data ${stringify(transactionData)}`);

      const transaction = new Transaction({
        rawTransaction: transactionData,
        fromAddress: this.address,
        privateKey: this.privateKey,
        networkId: this.networkId,
      }, this.network, 3);
      const transactionResponse = await transaction.execute();

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
      console.log(error);
      log.error(error);
    }
    return transactionResponse;
  }

  async sendRetryTransaction(relayer: IRelayer, rawTransactionData: ITransactionData) {
    // bump up gas price
    // nonce update
    // call sendTransaction
    // save new db data
  }

  async saveTransactionDataToDb() {

  }

  async onTransactionMined() {

  }

  async onTransactionDropped() {

  }

  async waitForTransactionResponse() {

  }
}
