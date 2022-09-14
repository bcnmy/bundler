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
