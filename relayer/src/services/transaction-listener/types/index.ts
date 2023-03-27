import { BigNumber, ethers } from 'ethers';
import { ICacheService } from '../../../../../common/cache';
import { ITransactionDAO, IUserOperationDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import {
  EntryPointMapType,
  EVMRawTransactionType, TransactionQueueMessageType, TransactionStatus, TransactionType,
} from '../../../../../common/types';
import { IEVMAccount } from '../../account';

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  transactionQueue: IQueue<TransactionQueueMessageType>,
  retryTransactionQueue: IQueue<RetryTransactionQueueData>,
  transactionDao: ITransactionDAO,
  userOperationDao: IUserOperationDAO,
  cacheService: ICacheService,
  options: {
    chainId: number
    entryPointMap: EntryPointMapType
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse?: ethers.providers.TransactionResponse,
  transactionId: string,
  transactionReceipt?: ethers.providers.TransactionReceipt,
  relayerAddress: string,
  transactionType: TransactionType,
  previousTransactionHash?: string,
  rawTransaction?: EVMRawTransactionType,
  walletAddress: string,
  metaData?: any,
  relayerManagerName: string,
  error?: string,
};

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean,
  transactionExecutionResponse: null | ethers.providers.TransactionResponse
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;

export type TransactionDataToBeUpdatedInDatabaseType = {
  transactionHash?: string;
  previousTransactionHash?: string;
  status?: TransactionStatus;
  transactionFee?: number;
  transactionFeeInUSD?: number;
  transactionFeeCurrency?: string;
  rawTransaction?: ethers.providers.TransactionResponse;
  gasPrice?: BigNumber;
  receipt?: object;
  resubmitted?: boolean;
  relayerAddress?: string;
  updationTime?: number;
};

export type NewTransactionDataToBeSavedInDatabaseType = {
  transactionId: string,
  transactionType: TransactionType,
  transactionHash: string,
  previousTransactionHash?: string,
  status: TransactionStatus,
  rawTransaction: ethers.providers.TransactionResponse,
  chainId: number,
  gasPrice?: BigNumber,
  relayerAddress: string,
  walletAddress: string,
  metaData: any,
  resubmitted: boolean,
  creationTime: number,
  updationTime: number,
};
