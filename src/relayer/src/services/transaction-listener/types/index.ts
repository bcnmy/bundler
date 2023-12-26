import { TransactionReceipt } from 'viem';
import { ICacheService } from '../../../../../common/cache';
import {
  ITransactionDAO, IUserOperationDAO, IUserOperationStateDAO,
} from '../../../../../common/db';
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
  userOperationStateDao: IUserOperationStateDAO,
  cacheService: ICacheService,
  options: {
    chainId: number
    entryPointMap: EntryPointMapType
  }
};

export type NotifyTransactionListenerParamsType = {
  transactionHash?: string,
  transactionId: string,
  transactionReceipt?: TransactionReceipt,
  relayerAddress: string,
  transactionType: TransactionType,
  previousTransactionHash?: string,
  rawTransaction: EVMRawTransactionType,
  walletAddress: string,
  metaData?: any,
  relayerManagerName: string,
  error?: string,
};

export type OnTransactionSuccessParamsType = NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType = NotifyTransactionListenerParamsType;

export type FrontRunnedTransactionDataToBeUpdatedInDatabaseType = {
  transactionHash?: string;
  previousTransactionHash?: string;
  status?: TransactionStatus;
  transactionFee?: number;
  transactionFeeInUSD?: number;
  transactionFeeCurrency?: string;
  rawTransaction?: EVMRawTransactionType;
  gasPrice?: bigint;
  receipt?: object;
  resubmitted?: boolean;
  relayerAddress?: string;
  updationTime?: number;
  frontRunnedTransactionHash?: string,
  frontRunnedReceipt?: object,
  frontRunnedTransactionFee?: number,
  frontRunnedTransactionFeeInUSD?: number,
  frontRunnedTransactionFeeCurrency? : string,
};
