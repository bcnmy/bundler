import { ICrossChainTransaction } from '../mongo/interface';

export interface ICrossChainTransactionDAO {
  updateByTransactionId(chainId: number, id: string, transactionData: object): Promise<void>;
  getByTransactionId(chainId: number, id: string): Promise<ICrossChainTransaction | null>;
}
