import { ITransactionDAO } from '../interface';
import { Mongo, IBlockchainTransaction } from '../mongo';

export class TransactionDAO implements ITransactionDAO {
  private _db: Mongo;

  constructor() {
    this._db = Mongo.getInstance();
  }

  async save(chainId: number, transactionData: object): Promise<void> {
    await this._db.getBlockchainTransaction(chainId).insertMany([transactionData]);
  }

  async updateByTransactionId(
    chainId: number,
    id: string,
    data: IBlockchainTransaction,
  ): Promise<void> {
    await this._db.getBlockchainTransaction(chainId).updateOne({
      transactionId: id,
    }).update(data);
  }

  async getByTransactionId(chainId: number, id: string): Promise<IBlockchainTransaction | null> {
    const data = await this._db.getBlockchainTransaction(chainId).findOne({
      transactionId: id,
    });
    if (data) {
      return data;
    }
    return null;
  }
}
