import type {
  CCMPVerificationData,
  ICrossChainTransactionStatusLogEntry,
} from '../../../common/db';
import type { CCMPMessage } from '../../../common/types';
import { CrossChainTransationStatus } from '../../../common/types';

// TODO: Split interfaces and types into separate files

export interface IHandler {
  (
    prev: ICrossChainTransactionStatusLogEntry,
    ctx: ICCMPTaskManager
  ): Promise<ICrossChainTransactionStatusLogEntry>;
}

export interface ICCMPTaskManager {
  message: CCMPMessage;
  sourceTxHash: string;
  verificationData: CCMPVerificationData;
  setVerificationData: (data: CCMPVerificationData) => void;
  destinationTxHash?: string;
  setDestinationTxHash: (txHash: string) => void;
  status: ICrossChainTransactionStatusLogEntry
  run: (
    name: string,
    handler: IHandler,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus
  ) => Promise<ICCMPTaskManager>;
}

export interface ICCMPService {
  processTransaction(message: CCMPMessage, sourceChainTxHash: string): Promise<void>;
}
