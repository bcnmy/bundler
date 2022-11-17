import type { CCMPMessage } from '../../../common/types';

export interface ICrossChainTransactionHandlerService {
  processTransaction(message: CCMPMessage, sourceChainTxHash: string): Promise<void>;
}
