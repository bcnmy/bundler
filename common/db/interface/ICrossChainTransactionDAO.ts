import { ICrossChainTransaction } from '../mongo/interface';

export interface ICrossChainTransactionDAO {
  save(chainId: number, transactionData: object): Promise<void>;
  updateByTransactionId(chainId: number, id: string, transactionData: object): Promise<void>;
  getByTransactionId(chainId: number, id: string): Promise<ICrossChainTransaction | null>;
}
