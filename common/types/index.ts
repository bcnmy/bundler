import { GetContractReturnType, TransactionReceipt } from 'viem';
import { ENTRY_POINT_ABI, OPTIMISM_L1_GAS_PRICE_ORACLE } from '../constants';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  FUNDING = 'FUNDING',
  BUNDLER = 'BUNDLER',
}

export enum TransactionMethodType {
  SCW = 'eth_sendSmartContractWalletTransaction',
  AA = 'eth_sendUserOperation',
  BUNDLER = 'eth_sendUserOperation',
}

export enum EthMethodType {
  ESTIMATE_USER_OPERATION_GAS = 'eth_estimateUserOperationGas',
  GET_USER_OPERATION_BY_HASH = 'eth_getUserOperationByHash',
  GET_USER_OPERATION_RECEIPT = 'eth_getUserOperationReceipt',
  SUPPORTED_ENTRY_POINTS = 'eth_supportedEntryPoints',
  CHAIN_ID = 'eth_chainId',
  GAS_AND_GAS_PRICES = 'eth_getUserOpGasFields',
  GET_USER_OPERATIONS_BY_API_KEY = 'eth_getUserOperationsByApiKey',
  GET_TRANSACTION_COUNT = 'eth_getTransactionCount',
  GET_BALANCE = 'eth_getBalance',
  GAS_PRICE = 'eth_gasPrice',
  FEE_HISTORY = 'eth_feeHistory',
  MAX_PRIORITY_FEE_PER_GAS = 'eth_maxPriorityFeePerGas',
  ESTIMATE_GAS = 'eth_estimateGas',
  ETH_CALL = 'eth_call',
  SEND_RAW_TRANSACTION = 'eth_sendRawTransaction',
}

export enum RpcMethod {
  getTransactionReceipt,
  waitForTransaction,
  getTransaction,
  getLatestBlockNumber,
  getFeeHistory,
}

export enum AlchemyMethodType {
  SIMULATE_EXECUTION = 'alchemy_simulateExecution',
}

export enum BiconomyMethodType {
  GET_GAS_FEE_VALUES = 'biconomy_getGasFeeValues',
  GET_USER_OPERATION_STATUS = 'biconomy_getUserOperationStatus',
}

export enum UserOperationStateEnum {
  BUNDLER_MEMPOOL = 'BUNDLER_MEMPOOL',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  DROPPED_FROM_BUNDLER_MEMPOOL = 'DROPPED_FROM_BUNDLER_MEMPOOL',
}

export enum RelayerDestinationSmartContractName {
  ENTRY_POINT = 'Entry Point',
}

export enum SocketEventType {
  onTransactionHashGenerated = 'transactionHashGenerated',
  onTransactionHashChanged = 'transactionHashChanged',
  onTransactionMined = 'transactionMined',
  onTransactionError = 'error',
}

export type TransactionQueueMessageType = {
  transactionId: string,
  event: SocketEventType,
  relayerManagerName: string,
  transactionHash?: string,
  previousTransactionHash?: string,
  receipt?: TransactionReceipt,
  error?: string,
};

export enum TransactionStatus {
  IN_PROCESS = 'IN_PROCESS',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DROPPED = 'DROPPED',
}

export enum RelayerManagerType {
  AA = 0,
  SCW = 0,
}

export type AccessListItem = {
  address: `0x${string}`;
  storageKeys: `0x${string}`[];
};

export type NetworkBasedGasPriceType = {
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
} | bigint;

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

export type AATransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  userOp?: UserOperationType;
  metaData?: {
    dappAPIKey: string
  }
};

export type BundlerTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  userOp?: UserOperationType;
};

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  walletAddress: string;
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

export function isError<T>(
  response: T | ErrorType,
): response is ErrorType {
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

export type SymbolMapByChainIdType = {
  [key: number]: {
    [key: string]: string,
  }
};

export type EntryPointMapType = {
  [chainId: number]: Array<{
    address: string,
    entryPointContract: EntryPointContractType
  }>
};

export type FeeSupportedToken = {
  address: string,
  symbol: string,
  decimal: number,
};

export interface TypedEvent<
  TArgsArray extends Array<any> = any,
  TArgsObject = any,
> extends Event {
  topics: string[];
  args: TArgsArray & TArgsObject;
}

export type UserOperationEventEvent = TypedEvent<
[string, string, string, BigInt, boolean, BigInt, BigInt],
{
  userOpHash: string;
  sender: string;
  paymaster: string;
  nonce: BigInt;
  success: boolean;
  actualGasCost: BigInt;
  actualGasUsed: BigInt;
}
>;

export type GetUserOperationReceiptReturnType = {
  success: string,
  actualGasCost: number,
  actualGasUsed: number,
  reason: string,
  logs: any,
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

export type DefaultGasOverheadType = {
  fixed: number,
  perUserOp: number,
  perUserOpWord: number,
  zeroByte: number,
  nonZeroByte: number,
  bundleSize: number,
  sigSize: number,
};

export type StakeInfo = {
  addr: string;
  stake: BigInt;
  unstakeDelaySec: BigInt;
};

export type UpdateRequestDataType = {
  chainId: number,
  apiKey: string,
  bundlerRequestId: string,
  transactionId?: string,
  rawResponse: object,
  httpResponseCode: number,
};

export type EntryPointContractType = GetContractReturnType<typeof ENTRY_POINT_ABI>;
export type OptimismL1GasPriceOracleContractType =
GetContractReturnType<typeof OPTIMISM_L1_GAS_PRICE_ORACLE>;
