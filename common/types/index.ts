export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  VANILLA_GASLESS = 'VANILLA_GASLESS',
  CROSS_CHAIN = 'CROSS_CHAIN',
}

export enum RelayerManagerType {
  AA = 0,
  SCW = 0,
  VANILLA_GASLESS = 0,
  CROSS_CHAIN = 1,
}

export type AATransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export type EVMRawTransactionType = {
  nonce: string,
  to: string,
  data: string,
  chainId: number,
  value: string,
  gasPrice: string,
  gasLimit: string,
};

export enum TransactionStatusType {
  IN_PROCESS = 'IN_PROCESS',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DROPPED = 'DROPPED',
}
