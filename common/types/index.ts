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
  onTransactionHashGenerated = 'onTransactionHashGenerated',
  onTransactionHashChanged = 'onTransactionHashChanged',
  onTransactionMined = 'onTransactionMined',
  onTransactionError = 'onTransactionError',
}

export type TransactionQueueMessageType = {
  transactionId: string,
  event: SocketEventType,
  receipt: ethers.providers.TransactionResponse,
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
  CROSS_CHAIN = 0,
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
  userOp?: UserOperationType
};

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
};

export type CCMPTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
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

type PromiseOrValue<T> = T | Promise<T>;

export type GasFeePaymentArgsStruct = {
  feeTokenAddress: PromiseOrValue<string>;
  feeAmount: PromiseOrValue<BigNumberish>;
  relayer: PromiseOrValue<string>;
};

export type CCMPMessagePayload = {
  to: string;
  _calldata: string;
};

export type CCMPMessage = {
  sender: string;
  sourceGateway: string;
  sourceAdaptor: string;
  sourceChainId: BigNumberish;
  destinationGateway: string;
  destinationChainId: BigNumberish;
  nonce: BigNumberish;
  routerAdaptor: string;
  gasFeePaymentArgs: GasFeePaymentArgsStruct;
  payload: CCMPMessagePayload[];
  hash: string;
};

export type EntryPointMapType = {
  [chainId: number]: Array<{
    address: string,
    entryPointContract: ethers.Contract
  }>
};
