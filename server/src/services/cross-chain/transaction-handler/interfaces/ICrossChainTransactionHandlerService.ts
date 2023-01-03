import type { CCMPMessageType } from '../../../../../../common/types';

export interface ICrossChainTransactionHandlerService {
  processTransaction(message: CCMPMessageType, sourceChainTxHash: string): Promise<void>;
  processTransactionFromTxHash(sourceTxHash: string): Promise<void>;
}
