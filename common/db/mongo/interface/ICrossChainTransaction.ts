import {
  CCMPMessage,
  CrossChainTransactionError,
  CrossChainTransationStatus,
} from '../../../types';

export type CCMPVerificationData = string | Uint8Array | undefined;

export interface ICrossChainTransactionStatusLogEntry {
  status: CrossChainTransationStatus | CrossChainTransactionError;
  timestamp: number;
  context?: Object;
  error?: boolean;
}

export interface ICrossChainTransaction {
  transactionId: string;
  statusLog: {
    executionIndex: number;
    sourceTxHash: string;
    logs: ICrossChainTransactionStatusLogEntry[];
  }[];
  creationTime: number;
  updationTime: number;
  sourceTransactionHash: string;
  message: CCMPMessage;
  verificationData?: CCMPVerificationData;
  destinationTxHash?: string;
}
