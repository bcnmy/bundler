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
