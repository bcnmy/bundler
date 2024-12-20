/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetContractReturnType, Hex } from "viem";
import { ENTRY_POINT_V07_ABI } from "../entrypoint-v7/abiv7";
import { EVMAccountInfo } from "../../relayer/account";
import { ENTRYPOINT_V6_ABI } from "@biconomy/gas-estimations";

export enum TransactionType {
  FUNDING = "FUNDING",
  BUNDLER = "BUNDLER",
}

export enum TransactionMethodType {
  BUNDLER = "eth_sendUserOperation",
}

export enum EthMethodType {
  ESTIMATE_USER_OPERATION_GAS = "eth_estimateUserOperationGas",
  GET_USER_OPERATION_BY_HASH = "eth_getUserOperationByHash",
  GET_USER_OPERATION_RECEIPT = "eth_getUserOperationReceipt",
  SUPPORTED_ENTRY_POINTS = "eth_supportedEntryPoints",
  CHAIN_ID = "eth_chainId",
  GAS_AND_GAS_PRICES = "eth_getUserOpGasFields",
  GET_USER_OPERATIONS_BY_API_KEY = "eth_getUserOperationsByApiKey",
  GET_TRANSACTION_COUNT = "eth_getTransactionCount",
  GET_BALANCE = "eth_getBalance",
  GAS_PRICE = "eth_gasPrice",
  FEE_HISTORY = "eth_feeHistory",
  MAX_PRIORITY_FEE_PER_GAS = "eth_maxPriorityFeePerGas",
  ESTIMATE_GAS = "eth_estimateGas",
  ETH_CALL = "eth_call",
  GET_TRANSACTION_RECEIPT = "eth_getTransactionReceipt",
  SEND_RAW_TRANSACTION = "eth_sendRawTransaction",
}

export enum AlchemyMethodType {
  SIMULATE_EXECUTION = "alchemy_simulateExecution",
}

export enum BiconomyMethodType {
  GET_GAS_FEE_VALUES = "biconomy_getGasFeeValues",
  GET_USER_OPERATION_STATUS = "biconomy_getUserOperationStatus",
}

export enum UserOperationStateEnum {
  BUNDLER_MEMPOOL = "BUNDLER_MEMPOOL",
  SUBMITTED = "SUBMITTED",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
  DROPPED_FROM_BUNDLER_MEMPOOL = "DROPPED_FROM_BUNDLER_MEMPOOL",
}

export enum TransactionStatus {
  IN_PROCESS = "IN_PROCESS",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  DROPPED = "DROPPED",
}

export type AccessListItem = {
  address: `0x${string}`;
  storageKeys: `0x${string}`[];
};

export type NetworkBasedGasPriceType =
  | {
      maxPriorityFeePerGas: bigint;
      maxFeePerGas: bigint;
    }
  | bigint;

export type EVMRawTransactionType = {
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

export type SendUserOperation = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  userOp?: UserOperationType | UserOperationStruct;
  walletAddress?: string;
  timestamp?: number;
};

type ResponseType = {
  code: number;
  transactionId: string;
};

type ErrorType = {
  code: number;
  error: string;
};

export type RelayServiceResponseType = ResponseType | ErrorType;

export function isError<T>(response: T | ErrorType): response is ErrorType {
  return (response as ErrorType).error !== undefined;
}

export type UserOperationType = {
  sender: `0x${string}`;
  nonce: bigint;
  initCode: `0x${string}`;
  callData: `0x${string}`;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: `0x${string}`;
  signature: `0x${string}`;
};

export type UserOperationStruct = {
  sender: Hex;
  nonce: bigint;
  factory: Hex;
  factoryData: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymaster: Hex;
  paymasterVerificationGasLimit: bigint;
  paymasterPostOpGasLimit: bigint;
  paymasterData: Hex;
  signature: Hex;
};

export type SymbolMapByChainIdType = {
  [key: number]: {
    [key: string]: string;
  };
};

export type EntryPointMapType = {
  [chainId: number]: Array<{
    address: string;
    entryPointContract: EntryPointContractType;
  }>;
};

export type EntryPointV07MapType = {
  [chainId: number]: Array<{
    address: string;
    entryPointContract: EntryPointV07ContractType;
  }>;
};

export type FeeSupportedToken = {
  address: string;
  symbol: string;
  decimal: number;
};

export interface TypedEvent<
  TArgsArray extends Array<any> = any,
  TArgsObject = any,
> extends Event {
  topics: string[];
  args: TArgsArray & TArgsObject;
}

export type UserOperationEventEvent = TypedEvent<
  [string, string, string, bigint, boolean, bigint, bigint],
  {
    userOpHash: string;
    sender: string;
    paymaster: string;
    nonce: bigint;
    success: boolean;
    actualGasCost: bigint;
    actualGasUsed: bigint;
  }
>;

export type GetUserOperationReceiptReturnType = {
  success: string;
  actualGasCost: number;
  actualGasUsed: number;
  reason: string;
  logs: any;
};

export type Log = {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
};

export type StakeInfo = {
  addr: string;
  stake: bigint;
  unstakeDelaySec: bigint;
};

export type UpdateRequestDataType = {
  chainId: number;
  apiKey: string;
  bundlerRequestId: string;
  transactionId?: string;
  rawResponse: object;
  httpResponseCode: number;
};

export type EntryPointContractType = GetContractReturnType<
  typeof ENTRYPOINT_V6_ABI
>;

export type EntryPointV07ContractType = GetContractReturnType<
  typeof ENTRY_POINT_V07_ABI
>;

export type StateOverrideSetType = {
  [key: string]: {
    balance?: Hex;
    nonce?: Hex;
    code?: Hex;
    state?: object;
    stateDiff?: object;
  };
};

export type ChainStatus = {
  chainId: number;
  healthy: boolean;
  errors: string[];
  latencies?: any;
};

export type EVMRelayerMetaDataType = {
  address: string;
  nonce: number;
  pendingCount: number;
  balance: number;
  chainNonce?: number;
  flashbotsNonce?: number;
};

export type StatusInfo = {
  [chainId: number]: { relayers: Array<EVMAccountInfo> };
};
