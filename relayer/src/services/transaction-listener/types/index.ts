import { ethers } from 'ethers';
import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import { EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount } from '../../account';

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
  transactionQueue: IQueue<TransactionMessageType>,
  retryTransactionQueue: IQueue<RetryTransactionQueueData>,
  transactionDao: ITransactionDAO,
  options: {
    chainId: number
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse: ethers.providers.TransactionResponse,
  transactionId: string,
  account: EVMAccount,
  previousTransactionHash: string | null,
  rawTransaction?: EVMRawTransactionType,
  userAddress?: string
};

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean,
  transactionExecutionResponse: null | ethers.providers.TransactionResponse
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;
