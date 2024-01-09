import {
  IUserOperationStateDAO,
  InitialUserOperationStateDataType,
  UpdateUserOperationStateDataType,
} from "../interface/IUserOperationStateDAO";
import { IUserOperationState, Mongo } from "../mongo";

export class UserOperationStateDAO implements IUserOperationStateDAO {
  private _db: Mongo;

  constructor() {
    this._db = Mongo.getInstance();
  }

  async save(
    chainId: number,
    data: InitialUserOperationStateDataType,
  ): Promise<void> {
    await this._db.getUserOperationState(chainId).insertMany([data]);
  }

  async updateState(
    chainId: number,
    data: UpdateUserOperationStateDataType,
  ): Promise<void> {
    const { transactionId } = data;
    await this._db.getUserOperationState(chainId).updateOne(
      {
        transactionId,
      },
      data,
    );
  }

  async get(
    chainId: number,
    userOpHash: string,
  ): Promise<IUserOperationState | null> {
    const data = await this._db.getUserOperationState(chainId).findOne({
      userOpHash,
    });
    return data;
  }
}
