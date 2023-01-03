import { ethers, BigNumberish } from 'ethers';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  CROSS_CHAIN = 'CROSS_CHAIN',
  FUNDING = 'FUNDING',
}

export enum CCMPRouterName {
  WORMHOLE = 'wormhole',
  AXELAR = 'axelar',
  HYPERLANE = 'hyperlane',
}

export enum TransactionMethodType {
  SCW = 'eth_sendSmartContractWalletTransaction',
  AA = 'eth_sendUserOperation',
  CROSS_CHAIN = 'eth_sendCrossChainTransaction',
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

export enum CrossChainTransationStatus {
  __START = 'START',
  TRANSACTION_VALIDATED = 'TRANSACTION_VALIDATED',
  SOURCE_TX_RECEIVED = 'SOURCE_TX_RECEIVED',
  PROTOCOL_FEE_PAID = 'PROTOCOL_FEE_PAID',
  PROTOCOL_CONFIRMATION_RECEIVED = 'PROTOCOL_CONFIRMATION_RECEIVED',
  DESTINATION_TRANSACTION_QUEUED = 'DESTINATION_TRANSACTION_QUEUED',
  DESTINATION_TRANSACTION_RELAYED = 'DESTINATION_TRANSACTION_RELAYED',
  DESTINATION_TRANSACTION_CONFIRMED = 'DESTINATION_TRANSACTION_CONFIRMED',
}

export enum CrossChainTransactionError {
  ALREADY_PROCESSED = 'ERR_ALREADY_PROCESSED',
  INSUFFICIENT_GAS_FEE = 'ERR_INSUFFICIENT_GAS_FEE_PAID',
  UNSUPPORTED_ROUTE = 'ERR_UNSUPPORTED_ROUTE',
  UNKNOWN_ERROR = 'ERR_UNKNOWN_ERR',
}

export enum RelayerManagerType {
  AA = 0,
  SCW = 0,
  CROSS_CHAIN = 0,
}

export type AccessListItem = {
  address: string;
  storageKeys: string[];
};

export type NetworkBasedGasPriceType =
  | {
    maxPriorityFeePerGas: string;
    maxFeePerGas: string;
  }
  | string;

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

export type CrossChainTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  message: CCMPMessageType;
  sourceTxHash: string;
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
    [key: string]: string;
  };
};

export type GasFeePaymentArgsStruct = {
  feeTokenAddress: string;
  feeAmount: BigNumberish;
  relayer: string;
};

export type CCMPMessagePayloadType = {
  to: string;
  _calldata: string;
};

export type CCMPMessageType = {
  sender: string;
  sourceGateway: string;
  sourceAdaptor: string;
  sourceChainId: BigNumberish;
  destinationGateway: string;
  destinationChainId: BigNumberish;
  nonce: BigNumberish;
  routerAdaptor: CCMPRouterName;
  gasFeePaymentArgs: GasFeePaymentArgsStruct;
  payload: CCMPMessagePayloadType[];
  hash: string;
};

export type EntryPointMapType = {
  [chainId: number]: Array<{
    address: string;
    entryPointContract: ethers.Contract;
  }>;
};

export type FeeSupportedToken = {
  address: string,
  symbol: string,
  decimal: number,
};
