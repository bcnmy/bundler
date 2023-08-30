/* eslint-disable no-else-return */
/* eslint-disable max-len */
import { ethers } from 'ethers';
import { Mutex } from 'async-mutex';
import { ICacheService } from '../../../../common/cache';
import { IGasPrice } from '../../../../common/gas-price';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import {
  getMaxRetryCountNotificationMessage,
  getTransactionErrorNotificationMessage,
  getRelayerFundingNotificationMessage,
} from '../../../../common/notification';
import { INotificationManager } from '../../../../common/notification/interface';
import { EVMRawTransactionType, NetworkBasedGasPriceType, TransactionType } from '../../../../common/types';
import { getRetryTransactionCountKey, getFailedTransactionRetryCountKey, parseError } from '../../../../common/utils';
import { config } from '../../../../config';
import { STATUSES } from '../../../../server/src/middleware';
import { IEVMAccount } from '../account';
import { INonceManager } from '../nonce-manager';
import { ITransactionListener } from '../transaction-listener';
import { ITransactionService } from './interface/ITransactionService';
import {
  CreateRawTransactionParamsType,
  CreateRawTransactionReturnType,
  ErrorTransactionResponseType,
  EVMTransactionServiceParamsType,
  ExecuteTransactionParamsType,
  ExecuteTransactionResponseType,
  RetryTransactionDataType,
  SuccessTransactionResponseType,
  TransactionDataType,
} from './types';

const log = logger(module);

export class EVMTransactionService implements
ITransactionService<IEVMAccount, EVMRawTransactionType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType>;

  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;

  gasPriceService: IGasPrice;

  cacheService: ICacheService;

  notificationManager: INotificationManager;

  addressMutex: {
    [address: string]: Mutex
  } = {};

  private isNonceError(errInString: string): boolean {
    const nonceErrorMessage = config.transaction.errors.networksNonceError[this.chainId];
    return nonceErrorMessage.some((message: string) => {
      if (errInString.toLowerCase().includes(message)) {
        return true;
      }
      return false;
    });
  }

  constructor(evmTransactionServiceParams: EVMTransactionServiceParamsType) {
    const {
      options, networkService, transactionListener, nonceManager, gasPriceService, cacheService, notificationManager,
    } = evmTransactionServiceParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionListener = transactionListener;
    this.nonceManager = nonceManager;
    this.gasPriceService = gasPriceService;
    this.cacheService = cacheService;
    this.notificationManager = notificationManager;
  }

  private getMutex(address: string) {
    if (!this.addressMutex[address]) {
      this.addressMutex[address] = new Mutex();
    }
    return this.addressMutex[address];
  }

  private async createTransaction(
    createTransactionParams: CreateRawTransactionParamsType,
  ): Promise<CreateRawTransactionReturnType> {
    // create raw transaction basis on data passed
    const {
      from,
      to,
      value,
      data,
      gasLimit,
      speed,
      account,
    } = createTransactionParams;
    const relayerAddress = account.getPublicKey();

    const nonce = await this.nonceManager.getNonce(relayerAddress);
    log.info(`Nonce for relayerAddress ${relayerAddress} is ${nonce} on chainId: ${this.chainId}`);
    const response = {
      from,
      to,
      value,
      gasLimit,
      data,
      chainId: this.chainId,
      nonce,
    };
    const gasPrice = await this.gasPriceService.getGasPrice(speed);
    if (typeof gasPrice !== 'string') {
      log.info(`Gas price being used to send transaction by relayer: ${relayerAddress} is: ${JSON.stringify(gasPrice)}`);
      const {
        maxPriorityFeePerGas,
        maxFeePerGas,
      } = gasPrice;
      return {
        ...response,
        type: 2,
        maxFeePerGas: ethers.utils.hexlify(Number(maxFeePerGas)),
        maxPriorityFeePerGas: ethers.utils.hexlify(Number(maxPriorityFeePerGas)),
      };
    }
    log.info(`Gas price being used to send transaction by relayer: ${relayerAddress} is: ${gasPrice}`);
    return { ...response, gasPrice: ethers.utils.hexlify(Number(gasPrice)) };
  }

  async executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
    transactionId: string,
  ): Promise<ExecuteTransactionResponseType> {
    const retryExecuteTransaction = async (retryExecuteTransactionParams: ExecuteTransactionParamsType): Promise<ExecuteTransactionResponseType> => {
      const { rawTransaction, account } = retryExecuteTransactionParams;
      try {
        try {
          log.info(`Getting failed transaction retry count for transactionId: ${transactionId} on chainId: ${this.chainId}`);
          const failedTransactionRetryCount = parseInt(await this.cacheService.get(getFailedTransactionRetryCountKey(transactionId, this.chainId)), 10);

          const maxFailedTransactionCount = config.transaction.failedTransactionRetryCount[this.chainId];

          if (failedTransactionRetryCount > maxFailedTransactionCount) {
            return {
              success: false,
              error: `Failed transaction retry limit reached for transactionId: ${transactionId}`,
            };
          }
        } catch (error) {
          // just loggin error here, don't want to block the transaction if in some case code does not work the intended way
          log.error(`Error in getting max failed retry transaction count: ${parseError(error)}`);
        }

        log.info(`Sending transaction to network: ${JSON.stringify(rawTransaction)}`);
        const transactionExecutionResponse = await this.networkService.sendTransaction(
          rawTransaction,
          account,
        );
        log.info(`Transaction execution response: ${JSON.stringify(transactionExecutionResponse)}`);
        if (transactionExecutionResponse instanceof Error) {
          log.info('Transaction execution failed and checking for retry');
          throw transactionExecutionResponse;
        }
        this.nonceManager.markUsed(account.getPublicKey(), rawTransaction.nonce);
        return {
          success: true,
          transactionResponse: transactionExecutionResponse,
        };
      } catch (error: any) {
        await this.cacheService.increment(getFailedTransactionRetryCountKey(transactionId, this.chainId), 1);
        const errInString = parseError(error).toLowerCase();
        log.info(`Error while executing transaction: ${errInString}`);
        const replacementFeeLowMessage = config.transaction.errors.networkResponseMessages
          .REPLACEMENT_UNDERPRICED;
        const alreadyKnownMessage = config.transaction
          .errors.networkResponseMessages.ALREADY_KNOWN;
        const insufficientFundsErrorMessage = [config
          .transaction.errors.networksInsufficientFundsError[this.chainId]]
        || config.transaction.errors.networkResponseMessages.INSUFFICIENT_FUNDS;

        if (this.isNonceError(errInString) || errInString.indexOf('increasing the gas price or incrementing the nonce') > -1) {
          log.info(`Nonce too low error for relayer ${rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`);
          rawTransaction.nonce = await this.nonceManager.getAndSetNonceFromNetwork(rawTransaction.from, true);
          log.info(`updating the nonce to ${rawTransaction.nonce}
       for relayer ${rawTransaction.from} on network id ${this.chainId}`);
          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (replacementFeeLowMessage.some((str) => errInString.indexOf(str) > -1)) {
          log.info(
            `Replacement underpriced error for relayer ${rawTransaction.from}
       on network id ${this.chainId}`,
          );
          const pastGasPrice = rawTransaction.gasPrice ? rawTransaction.gasPrice : {
            maxFeePerGas: rawTransaction.maxFeePerGas,
            maxPriorityFeePerGas: rawTransaction.maxPriorityFeePerGas,
          };
          const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
            pastGasPrice as NetworkBasedGasPriceType,
            config.transaction.bumpGasPriceMultiplier[this.chainId],
          );

          if (typeof bumpedUpGasPrice !== 'string') {
            log.info(`rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for relayer ${rawTransaction.from} on network id ${this.chainId} before bumping up`);
            log.info(`rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for relayer ${rawTransaction.from} on network id ${this.chainId} before bumping up`);
            rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
            rawTransaction.maxPriorityFeePerGas = bumpedUpGasPrice.maxPriorityFeePerGas;
            log.info(`increasing gas price for the resubmit transaction ${rawTransaction.gasPrice} for relayer ${rawTransaction.from} on network id ${this.chainId}`);
            log.info(`rawTransaction.maxFeePerGas ${rawTransaction.maxFeePerGas} for relayer ${rawTransaction.from} on network id ${this.chainId} after bumping up`);
            log.info(`rawTransaction.maxPriorityFeePerGas ${rawTransaction.maxPriorityFeePerGas} for relayer ${rawTransaction.from} on network id ${this.chainId} after bumping up`);
          } else {
            log.info(`rawTransaction.gasPrice ${rawTransaction.gasPrice} for relayer ${rawTransaction.from} on network id ${this.chainId} before bumping up`);
            rawTransaction.gasPrice = bumpedUpGasPrice;
            log.info(`increasing gas price for the resubmit transaction ${rawTransaction.gasPrice} for relayer ${rawTransaction.from} on network id ${this.chainId} after bumping up`);
          }

          return await retryExecuteTransaction({ rawTransaction, account });
        } else if (alreadyKnownMessage.some((str) => errInString.indexOf(str) > -1)) {
          log.info(
            `Already known transaction hash with same payload and nonce for relayer ${rawTransaction.from} on network id ${this.chainId}. Removing nonce from cache and retrying`,
          );
        } else if (insufficientFundsErrorMessage.some((str) => errInString.indexOf(str) > -1)) {
          log.info(`Relayer ${rawTransaction.from} has insufficient funds`);
          // Send previous relayer for funding
        } else {
          log.info('transaction not being retried');
          return {
            success: false,
            error: errInString,
          };
        }
        return {
          success: false,
          error: errInString,
        };
      }
    };

    const response = await retryExecuteTransaction(executeTransactionParams);
    return response;
  }

  private async sendMaxRetryCountExceededSlackNotification(
    transactionId: string,
    account: IEVMAccount,
    transactionType: TransactionType,
    chainId: number,
  ) {
    const maxRetryCountNotificationMessage = getMaxRetryCountNotificationMessage(
      transactionId,
      account,
      transactionType,
      chainId,
    );
    const slackNotifyObject = this.notificationManager.getSlackNotifyObject(maxRetryCountNotificationMessage);
    await this.notificationManager.sendSlackNotification(slackNotifyObject);
  }

  private async sendTransactionFailedSlackNotification(
    transactionId: string,
    chainId: number,
    error: string,
  ) {
    try {
      const message = getTransactionErrorNotificationMessage(transactionId, chainId, error);
      const slackNotifyObject = this.notificationManager.getSlackNotifyObject(message);
      await this.notificationManager.sendSlackNotification(slackNotifyObject);
    } catch (errorInSlack) {
      log.error(`Error in sending slack notification: ${parseError(errorInSlack)}`);
    }
  }

  private async sendRelayerFundingSlackNotification(
    relayerAddress: string,
    chainId: number,
    transactionHash: string,
  ) {
    try {
      const message = getRelayerFundingNotificationMessage(relayerAddress, chainId, transactionHash);
      const slackNotifyObject = this.notificationManager.getSlackNotifyObject(message);
      await this.notificationManager.sendSlackNotification(slackNotifyObject);
    } catch (errorInSlack) {
      log.error(`Error in sending slack notification: ${parseError(errorInSlack)}`);
    }
  }

  async sendTransaction(
    transactionData: TransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const relayerAddress = account.getPublicKey();

    const {
      to, value, data, gasLimit,
      speed, transactionId, walletAddress, metaData,
    } = transactionData;

    const retryTransactionCount = parseInt(await this.cacheService.get(getRetryTransactionCountKey(transactionId, this.chainId)), 10);

    const maxRetryCount = config.transaction.retryCount[transactionType][this.chainId];

    if (retryTransactionCount > maxRetryCount) {
      try {
      // send slack notification
        await this.sendMaxRetryCountExceededSlackNotification(
          transactionData.transactionId,
          account,
          transactionType,
          this.chainId,
        );
      } catch (error) {
        log.error(`Error in sending slack notification: ${parseError(error)}`);
      }
      // Should we send this response if we are manaully resubmitting transaction?
      // TODO: send a noOp transaction to the blockchain and notify on slack.
      return {
        state: 'failed',
        code: STATUSES.NOT_FOUND,
        error: 'Max retry count exceeded. Use end point to get transaction status', // todo add end point
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }

    log.info(`Transaction request received with transactionId: ${transactionId} on chainId ${this.chainId}`);

    const addressMutex = this.getMutex(account.getPublicKey());
    log.info(`Taking lock on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);
    const release = await addressMutex.acquire();
    log.info(`Lock taken on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);

    try {
      // create transaction
      const rawTransaction = await this.createTransaction({
        from: relayerAddress,
        to,
        value,
        data,
        gasLimit,
        speed,
        account,
      });
      log.info(`Raw transaction for transactionId: ${transactionId} is ${JSON.stringify(rawTransaction)} on chainId ${this.chainId}`);

      const transactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        account,
      }, transactionId);
      if (!transactionExecutionResponse.success) {
        await this.transactionListener.notify({
          transactionId: transactionId as string,
          relayerAddress,
          transactionType,
          previousTransactionHash: undefined,
          rawTransaction,
          walletAddress,
          metaData,
          relayerManagerName,
          error: transactionExecutionResponse.error,
        });
        throw new Error(transactionExecutionResponse.error);
      }

      log.info(`Transaction execution response for transactionId ${transactionData.transactionId}: ${JSON.stringify(transactionExecutionResponse)} on chainId ${this.chainId}`);

      log.info(`Incrementing nonce for account: ${relayerAddress} on chainId ${this.chainId}`);
      await this.nonceManager.incrementNonce(relayerAddress);
      log.info(`Incremented nonce for account: ${relayerAddress} on chainId ${this.chainId}`);

      // release lock once transaction is sent and nonce is incremented
      log.info(`Releasing lock on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);
      release();
      log.info(`Lock released on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);

      log.info(`Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`);
      const transactionListenerNotifyResponse = await this.transactionListener.notify({
        transactionExecutionResponse: transactionExecutionResponse.transactionResponse,
        transactionId: transactionId as string,
        relayerAddress,
        transactionType,
        previousTransactionHash: undefined,
        rawTransaction,
        walletAddress,
        metaData,
        relayerManagerName,
      });

      if (transactionType === TransactionType.FUNDING) {
        await this.sendRelayerFundingSlackNotification(relayerAddress, this.chainId, transactionExecutionResponse.transactionResponse.hash);
      }

      return {
        state: 'success',
        code: STATUSES.SUCCESS,
        transactionId,
        ...transactionListenerNotifyResponse,
      };
    } catch (error) {
      log.info(`Releasing lock on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);
      release();
      log.info(`Lock released on address: ${account.getPublicKey()} on chainId: ${this.chainId}`);
      log.info(`Error while sending transaction: ${error}`);
      await this.sendTransactionFailedSlackNotification(transactionId, this.chainId, parseError(error));
      return {
        state: 'failed',
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: parseError(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }

  async retryTransaction(
    retryTransactionData: RetryTransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
    const {
      transactionHash,
      transactionId,
      rawTransaction,
      walletAddress,
      metaData,
      relayerManagerName,
    } = retryTransactionData;
    try {
      await this.cacheService.increment(getRetryTransactionCountKey(transactionId, this.chainId));
      let pastGasPrice: NetworkBasedGasPriceType = rawTransaction.gasPrice as string;
      if (!pastGasPrice) {
        pastGasPrice = {
          maxFeePerGas: rawTransaction.maxFeePerGas as string,
          maxPriorityFeePerGas: rawTransaction.maxPriorityFeePerGas as string,
        };
      }
      // Make it general and EIP 1559 specific and get bump up from config
      const bumpedUpGasPrice = this.gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        config.transaction.bumpGasPriceMultiplier[this.chainId],
      );
      log.info(`Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`);

      if (typeof bumpedUpGasPrice === 'string') {
        rawTransaction.gasPrice = bumpedUpGasPrice as string;
        log.info(`Bumped up gas price for transactionId: ${transactionId} is ${bumpedUpGasPrice} on chainId ${this.chainId}`);
      } else if (typeof bumpedUpGasPrice === 'object') {
        rawTransaction.maxFeePerGas = bumpedUpGasPrice.maxFeePerGas;
        rawTransaction.maxPriorityFeePerGas = bumpedUpGasPrice.maxPriorityFeePerGas;
        log.info(`Bumped up gas price for transactionId: ${transactionId} is ${JSON.stringify(bumpedUpGasPrice)} on chainId ${this.chainId}`);
      }

      log.info(`Executing retry transaction for transactionId: ${transactionId}`);
      log.info(`Raw transaction for retrying transactionId: ${transactionId} is ${JSON.stringify(rawTransaction)} on chainId ${this.chainId}`);

      const retryTransactionExecutionResponse = await this.executeTransaction({
        rawTransaction,
        account,
      }, transactionId);
      let transactionExecutionResponse;
      if (retryTransactionExecutionResponse.success) {
        transactionExecutionResponse = retryTransactionExecutionResponse.transactionResponse;
      } else {
        await this.sendTransactionFailedSlackNotification(transactionId, this.chainId, retryTransactionExecutionResponse.error);
        return {
          state: 'failed',
          code: STATUSES.INTERNAL_SERVER_ERROR,
          error: JSON.stringify(retryTransactionExecutionResponse.error),
          transactionId,
          ...{
            isTransactionRelayed: false,
            transactionExecutionResponse: null,
          },
        };
      }

      log.info(`Notifying transaction listener for transactionId: ${transactionId} on chainId ${this.chainId}`);
      const transactionListenerNotifyResponse = await this.transactionListener.notify({
        transactionExecutionResponse,
        transactionId: transactionId as string,
        relayerAddress: account.getPublicKey(),
        rawTransaction,
        transactionType,
        previousTransactionHash: transactionHash,
        walletAddress,
        metaData,
        relayerManagerName,
      });

      return {
        state: 'success',
        code: STATUSES.SUCCESS,
        transactionId,
        ...transactionListenerNotifyResponse,
      };
    } catch (error) {
      log.info(`Error while retrying transaction: ${error} for transactionId: ${transactionId} on chainId: ${this.chainId}`);
      return {
        state: 'failed',
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: JSON.stringify(error),
        transactionId,
        ...{
          isTransactionRelayed: false,
          transactionExecutionResponse: null,
        },
      };
    }
  }
}
