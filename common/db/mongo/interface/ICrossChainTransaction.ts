import {
  CCMPMessageType,
  CrossChainTransactionError,
  CrossChainTransationStatus,
} from '../../../types';

export type CCMPVerificationData = string | Uint8Array | undefined;

export interface ICrossChainTransactionStatusLogEntry {
  status: CrossChainTransationStatus | CrossChainTransactionError;
  timestamp: number;
  context?: Object;
  error?: boolean;
  scheduleRetry?: boolean;
  sourceTxHash: string;
}

export interface ICrossChainTransaction {
  transactionId: string;
  status: CrossChainTransationStatus | CrossChainTransactionError;
  statusLog: ICrossChainTransactionStatusLogEntry[];
  creationTime: number;
  updationTime: number;
  sourceTransactionHash: string;
  retryCount: number;
  message: CCMPMessageType;
  verificationData?: CCMPVerificationData;
}
