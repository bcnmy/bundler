import type { CCMPMessage, CrossChainTransationStatus } from '../../../../../../common/types';
import type {
  CCMPVerificationData,
  ICrossChainTransactionStatusLogEntry,
} from '../../../../../../common/db';
import { ICrossChainProcessStep } from '../types';

export interface ICCMPTaskManager {
  message: CCMPMessage;
  sourceTxHash: string;
  verificationData: CCMPVerificationData;
  setVerificationData: (data: CCMPVerificationData) => void;
  status: ICrossChainTransactionStatusLogEntry;
  run: (
    name: string,
    handler: ICrossChainProcessStep,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus
  ) => Promise<ICCMPTaskManager>;
}
