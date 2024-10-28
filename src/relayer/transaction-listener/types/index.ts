import { TransactionReceipt } from "viem";
import { ICacheService } from "../../../common/cache";
import {
  ITransactionDAO,
  IUserOperationDAO,
  IUserOperationStateDAO,
  IUserOperationV07DAO,
} from "../../../common/db";
import { IQueue } from "../../../common/interface";
import { INetworkService } from "../../../common/network";
import { RetryTransactionQueueData } from "../../../common/queue/types";
import {
  EntryPointMapType,
  EntryPointV07MapType,
  EVMRawTransactionType,
  TransactionType,
} from "../../../common/types";
import { IEVMAccount } from "../../account";

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  retryTransactionQueue: IQueue<RetryTransactionQueueData>;
  transactionDao: ITransactionDAO;
  userOperationDao: IUserOperationDAO;
  userOperationDaoV07: IUserOperationV07DAO;
  userOperationStateDao: IUserOperationStateDAO;
  cacheService: ICacheService;
  options: {
    chainId: number;
    entryPointMap: EntryPointMapType;
    entryPointMapV07: EntryPointV07MapType;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metaData?: any;
  relayerManagerName: string;
  error?: string;
};

export type OnTransactionSuccessParamsType =
  NotifyTransactionListenerParamsType;
export type OnTransactionFailureParamsType =
  NotifyTransactionListenerParamsType;
