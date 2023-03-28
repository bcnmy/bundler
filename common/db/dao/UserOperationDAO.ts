import { InitialUserOperationDataType, FinalUserOperationDataType, IUserOperationDAO } from '../interface';
import { IUserOperation, Mongo } from '../mongo';

export class UserOperationDAO implements IUserOperationDAO {
  private _db: Mongo;

  constructor() {
    this._db = Mongo.getInstance();
  }

  async save(chainId: number, userOperationData: InitialUserOperationDataType): Promise<void> {
    await this._db.getUserOperation(chainId).insertMany([userOperationData]);
  }

  async getUserOperationDataByUserOpHash(
    chainId: number,
    userOpHash: string,
  ): Promise<IUserOperation | null> {
    const data = await this._db.getUserOperation(chainId).findOne({ userOpHash });
    return data;
  }

  async updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
    chainId: number,
    transactionId: string,
    userOpHash: string,
    userOperationData: FinalUserOperationDataType,
  ): Promise<void> {
    await this._db.getUserOperation(chainId).updateOne({
      transactionId,
      userOpHash,
    }, userOperationData);
  }

  async getUserOpsByTransactionId(
    chainId: number,
    transactionId: string,
  ): Promise<IUserOperation[]> {
    const data = await this._db.getUserOperation(chainId).find({
      transactionId,
    }).sort({ _id: -1 }).lean();
    return data;
  }
}
