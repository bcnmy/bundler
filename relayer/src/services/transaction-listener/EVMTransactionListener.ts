import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType, TransactionStatus } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionMessageType,
} from './types';

export class EVMTransactionListener implements
ITransactionListener, ITransactionPublisher<TransactionMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionMessageType>;

  retryTransactionQueue: IQueue<TransactionMessageType>;

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

  async publishToRetryTransactionQueue(data: TransactionMessageType): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTranasctionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = onTranasctionSuccessParams;
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      userAddress,
    );
    // add txn data in cache
    await this.publishToTransactionQueue(transactionExecutionResponse);
  }

  // private onTransactionDropped() {
  //   // when retry count expires
  //   // send no op txn just like defender
  //   // https://docs.openzeppelin.com/defender/relay#valid-until
  // }

  private async onTransactionFailure(onTranasctionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = onTranasctionFailureParams;
    await this.saveTransactionDataToDatabase(
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      userAddress,
    );
    // add txn data in cache
    await this.publishToTransactionQueue(transactionExecutionResponse);
  }

  private async saveTransactionDataToDatabase(
    transactionExecutionResponse: ethers.providers.TransactionResponse,
    transactionId: string,
    relayerAddress: string,
    userAddress?: string,
  ): Promise<void> {
    const transactionDataToBeSaveInDatabase = {
      transactionId,
      transactionHash: transactionExecutionResponse.hash,
      status: TransactionStatus.PENDING,
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

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<void> {
    const {
      transactionExecutionResponse, transactionId, relayerAddress, userAddress,
    } = notifyTransactionListenerParams;
    const tranasctionHash = transactionExecutionResponse.hash;
    // publish to queue with expiry header
    await this.publishToRetryTransactionQueue(transactionExecutionResponse);
    // pop happens when expiry header expires
    // retry txn service will check for receipt
    const transactionReceipt = await this.networkService.waitForTransaction(tranasctionHash);
    if (transactionReceipt.status === 1) {
      this.onTransactionSuccess({
        transactionExecutionResponse, transactionId, relayerAddress, userAddress,
      });
    } else if (transactionReceipt.status === 0) {
      this.onTransactionFailure({
        transactionExecutionResponse, transactionId, relayerAddress, userAddress,
      });
    }
  }
}
