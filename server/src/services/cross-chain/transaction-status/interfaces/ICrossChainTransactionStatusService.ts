import { CrossChainTransactionStatusResult } from '../types';

export interface ICrossChainTransactionStatusService {
  getStatusBySourceTransaction(
    sourceTxHash: string,
    chainId: number
  ): Promise<CrossChainTransactionStatusResult>;

  getStatusByMessageHash(
    messageHash: string,
    chainId: number
  ): Promise<CrossChainTransactionStatusResult>;
}
