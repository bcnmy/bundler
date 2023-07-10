import { BigNumber, BigNumberish, ethers } from 'ethers';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  CROSS_CHAIN = 'CROSS_CHAIN',
  FUNDING = 'FUNDING',
  GASLESS_FALLBACK = 'GASLESS_FALLBACK',
  BUNDLER = 'BUNDLER',
}

export enum TransactionMethodType {
  SCW = 'eth_sendSmartContractWalletTransaction',
  AA = 'eth_sendUserOperation',
  CROSS_CHAIN = 'eth_sendCrossChainTransaction',
  GASLESS_FALLBACK = 'eth_sendGaslessFallbackTransaction',
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
}

export enum RelayerDestinationSmartContractName {
  ENTRY_POINT = 'Entry Point',
  FALLBACK_GASLESS = 'Fallback Gasless',
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
  receipt?: ethers.providers.TransactionReceipt,
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
  CROSS_CHAIN = 1,
}

export type AccessListItem = {
  address: string;
  storageKeys: string[];
};

export type NetworkBasedGasPriceType = {
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
} | string;

export type EVMRawTransactionType = {
  from: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
  nonce: number;
  accessList?: AccessListItem[];
  type?: number;
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

export type GaslessFallbackTransactionMessageType = {
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
  sender: string;
  nonce: number;
  initCode: string;
  callData: string;
  callGasLimit: number;
  verificationGasLimit: number;
  preVerificationGas: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  paymasterAndData: string;
  signature: string;
};

export type SymbolMapByChainIdType = {
  [key: number]: {
    [key: string]: string,
  }
};

export type EntryPointMapType = {
  [chainId: number]: Array<{
    address: string,
    entryPointContract: ethers.Contract
  }>
};

export type FallbackGasTankMapType = {
  [chainId: number]: {
    address: string,
    fallbackGasTankContract: ethers.Contract
  }
};

export type GetMetaDataFromUserOpReturnType = {
  destinationSmartContractAddresses: Array<string>
  destinationSmartContractMethods: Array<{ name: string, address: string }>
};

export type GetMetaDataFromFallbackUserOpReturnType = GetMetaDataFromUserOpReturnType;
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
[string, string, string, BigNumber, boolean, BigNumber, BigNumber],
{
  userOpHash: string;
  sender: string;
  paymaster: string;
  nonce: BigNumber;
  success: boolean;
  actualGasCost: BigNumber;
  actualGasUsed: BigNumber;
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
  stake: BigNumberish;
  unstakeDelaySec: BigNumberish;
};
