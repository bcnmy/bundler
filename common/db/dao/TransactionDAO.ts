import { IBlockchainTransaction } from '../mongo/interface/IBlockchainTransaction';
import { ITransactionDAO } from '../interface/ITransactionDAO';
import { Mongo } from '../mongo/Mongo';

export class TransactionDAO implements ITransactionDAO {
  private _db;

  constructor() {
    this._db = Mongo.getInstance();
  }

  async save(chainId: number, data: IBlockchainTransaction): Promise<IBlockchainTransaction> {
    const data = await this._db.getBlockchainTransaction(chainId).save(data);
    return data;
  }
  updateByTransactionId(id: string, data: IBlockchainTransaction): Promise<IBlockchainTransaction> {
    await this._db.
  }
  getByTransactionId(id: string): Promise<IBlockchainTransaction> {
    throw new Error('Method not implemented.');
  }
}
