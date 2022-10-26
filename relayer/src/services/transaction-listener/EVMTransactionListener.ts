import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { RetryTransactionQueueData } from '../../../../common/queue/types';
import { EVMRawTransactionType, TransactionStatus } from '../../../../common/types';
import { EVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionListenerNotifyReturnType,
  TransactionMessageType,
} from './types';

const log = logger(module);

export class EVMTransactionListener implements
ITransactionListener<EVMAccount, EVMRawTransactionType>,
ITransactionPublisher<TransactionMessageType> {
  chainId: number;

  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionMessageType>;

  retryTransactionQueue: IQueue<RetryTransactionQueueData>;

  transactionDao: ITransactionDAO;

  constructor(
    evmTransactionListenerParams: EVMTransactionListenerParamsType,
  ) {
    const {
      options, networkService, transactionQueue, retryTransactionQueue, transactionDao,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionQueue = transactionQueue;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
  }

  async publishToTransactionQueue(data: TransactionMessageType): Promise<boolean> {
    await this.transactionQueue.publish(data);
    return true;
  }

  async publishToRetryTransactionQueue(data: RetryTransactionQueueData): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTranasctionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      account,
      previousTransactionHash,
      userAddress,
    } = onTranasctionSuccessParams;

    const relayerAddress = account.getPublicKey();

    log.info(`Publishing transaction data of transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    await this.publishToTransactionQueue(transactionExecutionResponse);

    log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      TransactionStatus.SUCCESS,
      previousTransactionHash,
      userAddress,
    );
  }

  private async onTransactionFailure(onTranasctionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      account,
      previousTransactionHash,
      userAddress,
    } = onTranasctionFailureParams;

    const relayerAddress = account.getPublicKey();

    log.info(`Publishing transaction data of transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    await this.publishToTransactionQueue(transactionExecutionResponse);

    log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      TransactionStatus.FAILED,
      previousTransactionHash,
      userAddress,
    );
  }

  private async saveTransactionDataToDatabase(
    transactionExecutionResponse: ethers.providers.TransactionResponse,
    transactionId: string,
    relayerAddress: string,
    status: TransactionStatus,
    previousTransactionHash: string | null,
    userAddress?: string,
  ): Promise<void> {
    const transactionDataToBeSaveInDatabase = {
      transactionId,
      transactionHash: transactionExecutionResponse.hash,
      previousTransactionHash,
      status,
      rawTransaction: transactionExecutionResponse,
      chainId: this.chainId,
      gasPrice: transactionExecutionResponse.gasPrice,
      receipt: {},
      relayerAddress,
      userAddress,
      creationTime: Date.now(),
      updationTime: Date.now(),
    };
    await this.transactionDao.save(this.chainId, transactionDataToBeSaveInDatabase);
  }

  private async waitForTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    const {
      transactionExecutionResponse,
      transactionId,
      account,
      previousTransactionHash,
      userAddress,
    } = notifyTransactionListenerParams;

    const tranasctionHash = transactionExecutionResponse.hash;
    log.info(`Transaction hash is: ${tranasctionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    const transactionReceipt = await this.networkService.waitForTransaction(tranasctionHash);
    log.info(`Transaction receipt is: ${JSON.stringify(transactionReceipt)} for transactionId: ${transactionId} on chainId ${this.chainId}`);

    if (transactionReceipt.status === 1) {
      log.info(`Transaction is a success for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionSuccess({
        transactionExecutionResponse,
        transactionId,
        account,
        previousTransactionHash,
        userAddress,
      });
    }
    if (transactionReceipt.status === 0) {
      log.info(`Transaction is a failure for transactionId: ${transactionId} on chainId ${this.chainId}`);
      this.onTransactionFailure({
        transactionExecutionResponse,
        transactionId,
        account,
        previousTransactionHash,
        userAddress,
      });
    }
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<TransactionListenerNotifyReturnType> {
    const {
      transactionExecutionResponse,
      transactionId,
      rawTransaction,
      account,
      userAddress,
    } = notifyTransactionListenerParams;
    if (!transactionExecutionResponse) {
      log.error('transactionExecutionResponse is null');
    }

    // publish to queue with expiry header
    // pop happens when expiry header expires
    // retry txn service will check for receipt
    log.info(`Publishing transaction data of transactionId: ${transactionId} to retry transaction queue on chainId ${this.chainId}`);
    await this.publishToRetryTransactionQueue({
      account,
      transactionHash: transactionExecutionResponse.hash,
      transactionId,
      rawTransaction: rawTransaction as EVMRawTransactionType,
      userAddress: userAddress as string,
    });
    // wait for transaction
    this.waitForTransaction(notifyTransactionListenerParams);
    return {
      isTransactionRelayed: true,
      transactionExecutionResponse,
    };
  }
}
