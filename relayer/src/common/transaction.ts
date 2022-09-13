export type EVMRawTransactionType = {
  nonce: string,
  to: string,
  data: string,
  chainId: number,
  value: string,
  gasPrice: string,
  gasLimit: string,
};

export interface IRetryPolicy {
  maxTries: number;
  shouldRetry: (err: any) => Promise<boolean>;
  incrementTry: () => void;
}

export enum TransactionStatus {
  IN_PROCESS = 'IN_PROCESS',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DROPPED = 'DROPPED',
}
