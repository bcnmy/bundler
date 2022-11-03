import { ethers } from 'ethers';
import { ICacheService } from '../../../../../common/cache';
import { ICrossChainTransactionDAO, ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { CrossChainRetryHandlerQueue } from '../../../../../common/queue/CrossChainRetryHandlerQueue';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import {
  CCMPMessage, EVMRawTransactionType, TransactionQueueMessageType, TransactionType,
} from '../../../../../common/types';
import { IEVMAccount } from '../../account';

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  transactionQueue: IQueue<TransactionQueueMessageType>,
  retryTransactionQueue: IQueue<RetryTransactionQueueData>,
  transactionDao: ITransactionDAO,
  cacheService: ICacheService,
  crossChainTransactionDAO: ICrossChainTransactionDAO;
  crossChainRetryHandlerQueueMap: Record<number, CrossChainRetryHandlerQueue>;
  options: {
    chainId: number
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse?: ethers.providers.TransactionResponse,
  transactionId: string,
  transactionReceipt?: ethers.providers.TransactionReceipt,
  relayerAddress: string,
  transactionType: TransactionType,
  previousTransactionHash: string | null,
  rawTransaction?: EVMRawTransactionType,
  userAddress?: string,
  relayerManagerName: string,
  ccmpMessage?: CCMPMessage
  error?: string,
};

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean,
  transactionExecutionResponse: null | ethers.providers.TransactionResponse
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;
