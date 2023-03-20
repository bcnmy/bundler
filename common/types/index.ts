import { ethers } from 'ethers';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  CROSS_CHAIN = 'CROSS_CHAIN',
  FUNDING = 'FUNDING',
  GASLESS_FALLBACK = 'GASLESS_FALLBACK',
}

export enum TransactionMethodType {
  SCW = 'eth_sendSmartContractWalletTransaction',
  AA = 'eth_sendUserOperation',
  CROSS_CHAIN = 'eth_sendCrossChainTransaction',
  GASLESS_FALLBACK = 'eth_sendGaslessFallbackTransaction',
}

export enum EthMethodType {
  ESTIMATE_USER_OPERATION_GAS = 'eth_estimateUserOperationGas',
  GET_USER_OPERATION_BY_HASH = 'eth_estimateUserOperationGas',
  GET_USER_OPERATION_RECEIPT = 'eth_getUserOperationReceipt',
  SUPPORTED_ENTRY_POINTS = 'eth_supportedEntryPoints',
  CHAIN_ID = 'eth_chainId',
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
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
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
