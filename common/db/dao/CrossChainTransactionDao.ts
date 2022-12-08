import { ICrossChainTransactionDAO } from '../interface';
import { Mongo, ICrossChainTransaction } from '../mongo';

export class CrossChainTransactionDAO implements ICrossChainTransactionDAO {
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
    data: ICrossChainTransaction,
  ): Promise<void> {
    await this._db
      .getCrossChainTransaction(chainId)
      .updateOne(
        {
          transactionId: id,
        },
        data,
      )
      .setOptions({ upsert: true });
  }

  async getByTransactionId(chainId: number, id: string): Promise<ICrossChainTransaction | null> {
    const data = await this._db.getCrossChainTransaction(chainId).findOne({
      transactionId: id,
    });
    if (data) {
      return data;
    }
    return null;
  }
}
