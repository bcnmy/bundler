import { IBlockchainTransaction } from '../mongo/interface/IBlockchainTransaction';

export interface ITransactionDAO {
  save(chainId: number, data: IBlockchainTransaction): Promise<IBlockchainTransaction>
  update(data: IBlockchainTransaction): Promise<IBlockchainTransaction>
  getByTransactionId(id: string): Promise<IBlockchainTransaction>
}
