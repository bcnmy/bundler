import {
  CCMPMessage,
  CrossChainTransactionError,
  CrossChainTransationStatus,
} from '../../../types';

export interface ICrossChainTransaction {
  transactionId: string;
  statusLog: {
    executionIndex: number;
    logs: {
      sourceTxHash: string;
      status: CrossChainTransationStatus | CrossChainTransactionError;
      timestamp: number;
      context?: Object;
      error?: boolean;
    }[];
  }[];
  creationTime: number;
  updationTime: number;
  sourceTransactionHash: string;
  message: CCMPMessage;
  verificationData?: string;
}
