/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
import { ethers } from 'ethers';
import { config } from '../../../config';
import { logger } from '../../../../common/log-config';
import {
  getGasPriceKey, getNetworkRpcUrlsKey, getTransactionDataKey, getTransactionKey,
} from '../../utils/cache-utils';
import { cache } from '../../../../common/caching';
import { stringify } from '../../utils/util';
import { redisClient } from '../../../../common/db';
import { TransactionStatus } from '../../common/types';
import { AbstarctTransactionManager } from './abstract-transaction-manager';
import { ExecuteParams, ITransactionData } from './types';
import { getNativeTokenPriceInUSD } from '../../utils/native-token-price';

const log = logger(module);

export class EvmTransactionManager extends AbstarctTransactionManager {
  static bumpGasPrice(gasPrice: string, percent: number): String {
    const gasPriceInInt = parseInt(gasPrice, 16);
    const bumpedGasPrice = gasPriceInInt + parseInt((gasPriceInInt * (percent / 100)
    ).toString(), 10);
    return ethers.utils.hexValue(bumpedGasPrice);
  }

  async getGasPrice(): Promise<string> {
    // TODO get it from gasPriceMap instance
    const gasPriceFromCache = await cache.get(getGasPriceKey(this.chainId));
    log.info(`Gas price for ${this.chainId} in cache is ${gasPriceFromCache} on network id ${this.chainId}`);
    const gasPrice = ethers.utils.hexValue(Number(gasPriceFromCache));
    return gasPrice;
  }

  async sendTransaction(
    relayer: IRelayer,
    transactionData: ITransactionData,
  ) :Promise<SendTransactionReturnType> {
    // TODO
    // For each transaction type, different retry counts would be there
    // Mapping of retry counts
    // ex: Cross chain txn will keep retrying the txns till success
    const { retryCount } = config;
    let transactionExecutionResponse;
    if (!relayer.active) {
      return {
        error: 'Relayer not active',
      };
    }

    const {
      gasLimit, to, data, transactionId, value, chainId,
    } = transactionData;

    const retryTransaction = relayer.retryCount > 0;

    const gasPrice = await this.getGasPrice();
    const nonce = relayer.nonce.toString();

    log.info(`Transaction Id: ${transactionId} sent with gas price of ${gasPrice} and nonce as ${nonce} on chain id ${chainId} by relayer: ${relayer.address}`);

    const gasLimitToUse = (gasLimit && gasLimit.hex) || '0xAAE60';
    log.info(`Gas limit to be used in transactionId: ${transactionId} is ${gasLimitToUse}`);

    const nonceForTransaction = ethers.BigNumber.from(nonce).toHexString();
    try {
      const rawTransaction = {
        gasPrice,
        gasLimit: gasLimitToUse,
        to,
        value,
        data,
        chainId,
        nonce: nonceForTransaction,
      };
      log.info(`Transaction Id: ${transactionId} sent with data ${stringify(transactionData)}`);

      transactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        network: this.network,
        retryCount,
        relayerAddress: relayer.address,
        relayerPrivateKey: relayer.privateKey,
        transactionId,
      });

      if (!transactionExecutionResponse.error) {
        await relayer.setBalance();
        this.waitForTransactionResponse(
          transactionId,
          transactionExecutionResponse,
          retryTransaction, // true if retry count greater than 0 else false
        );
        if (transactionExecutionResponse.nonce) {
          relayer.nonce = transactionExecutionResponse.nonce + 1;
        }

        // add data to cache for retry service
        const transactionKey = getTransactionKey(transactionId);
        const transactionKeyExpiry = config
          .relayerService.txnHashKeyExpiryTimePerNetwork[this.chainId];
        log.info(`Adding ${transactionKey} with expiry ${transactionKeyExpiry} in redis on chainId ${this.chainId}`);
        await redisClient.set(transactionKey, '1');
        await redisClient.expire(
          transactionKey,
          transactionKeyExpiry,
        );
        const cacheData = {
          ...transactionData,
          gasPrice,
          nonce: transactionExecutionResponse.nonce,
          hash: transactionExecutionResponse.hash,
          relayerAddress: transactionExecutionResponse.from,
        };
        await cache.set(
          getTransactionDataKey(transactionId),
          stringify(cacheData),
        );

        // save transaction to db
        await this.saveTransactionDataToDb(transactionExecutionResponse);
      } else {
        // send socket event to client about error
        log.info(`Publish error to socket client via relayer ${transactionExecutionResponse.error}`);
        this.messenger.sendErrorMessage(
          transactionId,
          transactionExecutionResponse.error,
        );
      }
    } catch (error: any) {
      console.log(error);
      log.error(error);
    }
    return transactionExecutionResponse;
  }

  async executeTransaction(executeParams: ExecuteParams): Promise<any> {
    const {
      rawTransaction, relayerAddress, relayerPrivateKey, transactionId,
    } = executeParams;
    let data: TransactionResponse;
    log.info(`Executing transaction at ${Date.now()} from relayer address ${relayerAddress} on chainId ${this.chainId}`);
    const networkRpcUrlsData = await redisClient.get(getNetworkRpcUrlsKey()) as string;

    const networkRpcUrls = JSON.parse(networkRpcUrlsData);
    const providers = (networkRpcUrls && networkRpcUrls[this.chainId]) || [{
      name: 'default',
      rpcUrl: this.network.networkUrl,
    }];

    // TODO
    // Check this for loop, is there a better way to do it
    for await (const provider of providers) {
      this.network.setProvider(provider.rpcUrl);
      try {
        data = await this.network.executeTransaction(
          rawTransaction,
          relayerAddress,
          relayerPrivateKey,
        );
        if (data) {
          return data;
        }
      } catch (error:any) {
        log.info(`Error while executing transaction on transactionId: ${transactionId} by relayer: ${relayerAddress} on chainId: ${this.chainId}`);
        log.info(error);
        const shouldTransactionBeRetired = await this.shouldRetryTransaction(error.toString());
        log.info(`Status for retrying is ${shouldTransactionBeRetired} by relayer ${relayerAddress} on chainId ${this.chainId}`);
        if (shouldTransactionBeRetired) {
          // TODO
          // Relayer retry count logic review
          this.incrementTry();
          log.info(`retry count is ${this.retryCount} from address ${relayerAddress} on network id ${this.chainId}`);
          return await Promise.resolve(this.executeTransaction(executeParams));
        }
        return {
          error: `transaction failed with error ${error.toString()} from address ${relayerAddress} on network id ${this.chainId}`,
        };
      }
    }
  }

  async sendRetryTransaction(relayer: IRelayer, rawTransactionData: ITransactionData) {
    // bump up gas price
    // nonce update
    // call sendTransaction
    // save new db data
  }

  async saveTransactionDataToDb(transactionExecutionResponse) {
    const currentTimeInMs = Date.now();
    try {
      log.info(`saving data in db for transaction id ${transactionId}`);
      if (retryTransaction) {
        const previousTransactoinDataFromDB: any = await this.daoUtilsInstance.getTransaction({
          transactionHash: previousTransactionHash,
        }, this.chainId);

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
            networkId: this.chainId,
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
          await this.daoUtilsInstance.saveTransaction(this.chainId, retryTransactionData);
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
            chainId: this.chainId,
          },
          relayerAddress: this.address,
          transactionFee: 0,
          transactionFeeCurrency: config.currency[this.chainId],
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
          this.chainId,
          transactionDataInDB,
        );
      }
    } catch (error: any) {
      log.error(`error while saving data in db ${stringify(error)}`);
    }
  }

  async onTransactionMined() {
    const transactionFee = (parseInt(tx.receipt.effectiveGasPrice.hex, 16)
            * parseInt(tx.receipt.gasUsed.hex, 16))
            * 10 ** (-1 * config.decimal[this.chainId]);
    const baseCurrencyInFiat = await getNativeTokenPriceInUSD(this.chainId);
    const transactionFeeInFiat = transactionFee * baseCurrencyInFiat;

    const currentTimeInMs = Date.now();
    // status of the transaction would be updated by gas management service
    await this.daoUtilsInstance.updateTransaction(
      {
        transactionHash: tx.transactionHash,
      },
      this.chainId,
      {
        receipt: tx.receipt,
        baseCurrencyInFiat,
        transactionFee,
        transactionFeeInFiat,
        updationTime: currentTimeInMs,
      },
    );
    this.pendingTransactionCount -= 1;
    log.info(`onTransactionMined => Reducing pending transaction count for relayer ${this.address}. Current pending count is ${this.pendingTransactionCount} on network id ${this.chainId}`);
    this.checkBalanceBelowThreshold();
    await Promise.all([
      Relayer.removeRetry(tx.transactionId),
      this.checkPendingTransactionThreshold(),
    ]);
  }

  async onTransactionDropped() {
    log.info(`Tx dropped message received in relayer for:\n ${stringify({
      id: tx.transactionId,
      hash: tx.transactionHash,
      relayerAddress: tx.relayerAddress,
      networkId: tx.networkId,
    })
    }`);
    // Dropped will be dealt any differently here?
    this.pendingTransactionCount -= 1;
    log.info(`onTransactionDropped => Reducing pending transaction count for relayer ${this.address}. Current pending count is ${this.pendingTransactionCount} on network id ${this.chainId}`);
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
      log.info(`Transaction Id:- ${transactionId} with new transaction hash ${transactionResponse.hash} and previous transaction hash ${previousTransactionHash} on network id ${this.chainId}`);
      try {
        await this.messenger.sendTransactionHashChanged(
          transactionId,
          transactionResponse.hash,
          this.chainId,
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
      log.info(`Transaction Id:- ${transactionId} and transaction hash is ${transactionResponse.hash} on network id ${this.chainId}`);
      try {
        await this.messenger.sendTransactionHashGenerated(
          transactionId,
          transactionResponse.hash,
          this.chainId,
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

  shouldRetryTransaction = async (err: string): Promise<boolean> => {
    const nonceErrorMessage = config.relayerService.networksNonceError[this.chainId];
    const replacementFeeLowMessage = REPLACEMENT_UNDERPRICED;
    const alreadyKnownMessage = ALREADY_KNOWN;
    const insufficientFundsErrorMessage = config
      .relayerService.networksInsufficientFundsError[this.chainId]
        || INSUFFICIENT_FUNDS;

    if (this.retryCount >= this.maxTries) return false;

    if (err.indexOf(nonceErrorMessage) > -1 || err.indexOf('increasing the gas price or incrementing the nonce') > -1) {
      log.info(
        `Nonce too low error for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`,
      );
      this.params.rawTransaction.nonce = await this.network
        .getNonce(this.params.rawTransaction.from, true);
      log.info(`updating the nonce to ${this.params.rawTransaction.nonce} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
    } else if (err.indexOf(replacementFeeLowMessage) > -1) {
      log.info(
        `Replacement underpriced error for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`,
      );
      let { gasPrice } = await this.network.getGasPrice();

      log.info(`gas price from network ${gasPrice}`);
      const gasPriceInNumber = ethers.BigNumber.from(
        gasPrice.toString(),
      ).toNumber();

      log.info(`this.params.rawTransaction.gasPrice ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);

      if (gasPrice < this.params.rawTransaction.gasPrice) {
        gasPrice = this.params.rawTransaction.gasPrice;
      }
      log.info(`transaction sent with gas price ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      log.info(`bump gas price ${config.bumpGasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      log.info(`gasPriceInNumber ${gasPriceInNumber} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
      this.params.rawTransaction.gasPrice = (
        gasPriceInNumber * config.bumpGasPrice
      ) + gasPriceInNumber;
      log.info(`increasing gas price for the resubmit transaction ${this.params.rawTransaction.gasPrice} for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}`);
    } else if (errInString.indexOf(alreadyKnownMessage) > -1) {
      log.info(
        `Already known transaction hash with same payload and nonce for relayer ${this.params.rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`,
      );
    } else if (errInString.indexOf(insufficientFundsErrorMessage) > -1) {
      log.info(`Relayer ${this.params.rawTransaction.from} has insufficient funds`);
      // Send previous relayer for funding
    } else {
      log.info('transaction not being retried');
      return false;
    }
    return true;
  };

  incrementTry() {
    this.retryCount += 1;
  }

  static async removeRetry(transactionId: string) {
    await redisClient.del(getTransactionDataKey(transactionId));
    await redisClient.del(getTransactionKey(transactionId));
  }
}
