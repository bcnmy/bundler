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
  sourceTxHash: string;
}

export interface ICrossChainTransaction {
  transactionId: string;
  status: ICrossChainTransactionStatusLogEntry;
  statusLog: ICrossChainTransactionStatusLogEntry[];
  creationTime: number;
  updationTime: number;
  sourceTransactionHash: string;
  message: CCMPMessage;
  verificationData?: CCMPVerificationData;
  destinationTxHash?: string;
}
