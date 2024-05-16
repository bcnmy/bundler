import { TransactionReceipt } from "viem";
import { ICacheService } from "../../../common/cache";
import { IUserOperationDAO, IUserOperationStateDAO } from "../../../common/db";
import {
  EntryPointMap,
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { INetworkService } from "../../network";

export type EVMTransactionListenerParamsType = {
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  userOperationDao: IUserOperationDAO;
  userOperationStateDao: IUserOperationStateDAO;
  cacheService: ICacheService;
  options: {
    entryPointMap: EntryPointMap;
  };
};

export type NotifyTransactionListenerParamsType = {
  transactionHash: string;
  transactionId: string;
  relayerAddress: string;
  previousTransactionHash?: string;
  rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction;
};

export type OnTransactionSuccessParamsType = {
  transactionHash: string;
  transactionId: string;
  transactionReceipt: TransactionReceipt;
  relayerAddress: string;
  previousTransactionHash?: string;
  rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction;
};
export type OnTransactionFailureParamsType = OnTransactionSuccessParamsType;
