import { ethers } from 'ethers';
import { ICacheService } from '../../../../../common/cache';
import { ICrossChainTransactionDAO, ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import { EVMRawTransactionType, TransactionQueueMessageType, TransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  transactionQueue: IQueue<TransactionQueueMessageType>,
  retryTransactionQueue: IQueue<RetryTransactionQueueData>,
  transactionDao: ITransactionDAO,
  cacheService: ICacheService,
  crossChainTransactionDAO: ICrossChainTransactionDAO;
  options: {
    chainId: number
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse: ethers.providers.TransactionResponse,
  transactionId: string,
  relayerAddress: string,
  transactionType: TransactionType,
  previousTransactionHash: string | null,
  rawTransaction?: EVMRawTransactionType,
  userAddress?: string,
  relayerManagerName: string,
  transactionReceipt?: ethers.providers.TransactionReceipt,
};

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean,
  transactionExecutionResponse: null | ethers.providers.TransactionResponse
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;
