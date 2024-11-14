import { ICacheService } from "../../../common/cache";
import { ITransactionDAO, IUserOperationStateDAO } from "../../../common/db";
import { IGasPriceService } from "../../../common/gas-price";
import { GasPriceType } from "../../../common/gas-price/types";
import { INetworkService } from "../../../common/network";
import { RetryTransactionQueueData } from "../../../common/queue/types";
import { INotificationManager } from "../../../common/notification/interface";
import { AccessListItem, EVMRawTransactionType } from "../../../common/types";
import { IEVMAccount } from "../../account";
import { INonceManager } from "../../nonce-manager";
import { ITransactionListener } from "../../transaction-listener";

export type EVMTransactionServiceParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType>;
  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;
  gasPriceService: IGasPriceService;
  transactionDao: ITransactionDAO;
  cacheService: ICacheService;
  notificationManager: INotificationManager;
  userOperationStateDao: IUserOperationStateDAO;
  options: {
    chainId: number;
  };
};

export type TransactionResponseType = {
  chainId: number;
  transactionId: string;
  transactionHash: string;
  relayerAddress: string;
};

export type TransactionDataType = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit: `0x${string}`;
  speed?: GasPriceType;
  walletAddress: string;
  transactionId: string;
  metaData?: {
    dappAPIKey: string;
  };
  timestamp?: number;
};

export type ErrorTransactionResponseType = {
  state: "failed";
  code: number;
  error: string;
  transactionId: string;
};

export type SuccessTransactionResponseType = {
  state: "success";
  code: number;
  transactionId: string;
};

export type CreateRawTransactionParamsType = {
  from: string;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  gasLimit: `0x${string}`;
  speed?: GasPriceType;
  account: IEVMAccount;
  transactionId: string;
};

export type CreateRawTransactionReturnType = EVMRawTransactionType;

export type ExecuteTransactionParamsType = {
  rawTransaction: EVMRawTransactionType;
  account: IEVMAccount;
};

export type ExecuteTransactionResponseType = {
  hash: string;
  from: string;
  gasPrice?: bigint;
  maxPriorityFeePerGas?: bigint;
  maxFeePerGas?: bigint;
  gasLimit: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  chainId: number;
  nonce: number;
  accessList?: AccessListItem[];
  type: string;
};

export type EVMTransactionResponseType = TransactionResponseType;

export type RetryTransactionDataType = RetryTransactionQueueData;
