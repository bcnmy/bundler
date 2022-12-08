import type { ICrossChainTransactionStatusLogEntry } from '../../../../../../common/db';
import type { ICCMPTaskManager } from '../interfaces/ICCMPTaskManager';

export interface ICrossChainProcessStep {
  (
    prev: ICrossChainTransactionStatusLogEntry,
    ctx: ICCMPTaskManager
  ): Promise<ICrossChainTransactionStatusLogEntry>;
}
