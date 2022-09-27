import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType, TransactionStatus } from '../../../../common/types';
import { IEVMAccount } from '../account/interface/IEVMAccount';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionListenerMessageType,
} from './types';

export class EVMTransactionListener implements
ITransactionListener, ITransactionPublisher<TransactionListenerMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  queue: IQueue<TransactionListenerMessageType>;

  transactionDao: ITransactionDAO;

  constructor(
    chainId: number,
    networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>,
    queue: IQueue<TransactionListenerMessageType>,
    transactionDao: ITransactionDAO,
  ) {
    this.chainId = chainId;
    this.networkService = networkService;
    this.queue = queue;
    this.transactionDao = transactionDao;
  }

  async publish(data: TransactionListenerMessageType): Promise<boolean> {
    await this.queue.publish(data);
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
  }

  private onTransactionDropped() {

  }

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
