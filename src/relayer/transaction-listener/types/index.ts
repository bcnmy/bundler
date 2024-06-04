import { TransactionReceipt } from "viem";
import { ICacheService } from "../../../common/cache";
import {
  ITransactionDAO,
  IUserOperationDAO,
  IUserOperationStateDAO,
} from "../../../common/db";
import { IQueue } from "../../../common/interface";
import { INetworkService } from "../../../common/network";
import { RetryTransactionQueueData } from "../../../common/queue/types";
import {
  EntryPointMapType,
  EVMRawTransactionType,
  TransactionType,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { IMonitoringService } from "../../../common/monitoring/interface";

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  retryTransactionQueue: IQueue<RetryTransactionQueueData>;
  transactionDao: ITransactionDAO;
  userOperationDao: IUserOperationDAO;
  userOperationStateDao: IUserOperationStateDAO;
  cacheService: ICacheService;
  monitoringService: IMonitoringService;
  options: {
    chainId: number;
    entryPointMap: EntryPointMapType;
  };
};

export type NotifyTransactionListenerParamsType = {
  transactionHash?: string;
  transactionId: string;
  transactionReceipt?: TransactionReceipt;
  relayerAddress: string;
  transactionType: TransactionType;
  previousTransactionHash?: string;
  rawTransaction: EVMRawTransactionType;
  walletAddress: string;
  metaData?: any;
  relayerManagerName: string;
  error?: string;
};

export type OnTransactionSuccessParamsType =
  NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType =
  NotifyTransactionListenerParamsType;
