import {
  FinalUserOperationDataType,
  IUserOperationV07DAO,
  InitialUserOperationV07DataType,
} from "../interface";
import { IUserOperationV07, Mongo } from "../mongo";

export class UserOperationV07DAO implements IUserOperationV07DAO {
  private _db: Mongo;

  constructor() {
    this._db = Mongo.getInstance();
  }

  async save(
    chainId: number,
    userOperationData: InitialUserOperationV07DataType,
  ): Promise<void> {
    await this._db.getUserOperationV07(chainId).insertMany([userOperationData]);
  }

  async getUserOperationsDataByApiKey(
    chainId: number,
    apiKey: string,
    startTime: number,
    endTime: number,
    limit: number,
    offSet: number,
  ): Promise<Array<IUserOperationV07>> {
    const data = await this._db
      .getUserOperationV07(chainId)
      .aggregate([
        {
          $match: {
            $and: [
              { "metaData.apiKey": apiKey },
              { creationTime: { $gte: startTime } },
              { creationTime: { $lte: endTime } },
            ],
          },
        },
      ])
      .skip(offSet)
      .limit(limit);
    return data;
  }

  async getUserOperationDataByUserOpHash(
    chainId: number,
    userOpHash: string,
  ): Promise<IUserOperationV07 | null> {
    const data = await this._db
      .getUserOperationV07(chainId)
      .findOne({ userOpHash });
    return data;
  }

  async updateUserOpDataToDatabaseByTransactionIdAndUserOpHash(
    chainId: number,
    transactionId: string,
    userOpHash: string,
    userOperationData: FinalUserOperationDataType,
  ): Promise<void> {
    await this._db.getUserOperationV07(chainId).updateOne(
      {
        transactionId,
        userOpHash,
      },
      userOperationData,
    );
  }

  async getUserOpsByTransactionId(
    chainId: number,
    transactionId: string,
  ): Promise<IUserOperationV07[]> {
    const data = await this._db
      .getUserOperationV07(chainId)
      .find({
        transactionId,
      })
      .sort({ _id: -1 })
      .lean();
    return data;
  }

  async getUserOperationsCountByApiKey(
    chainId: number,
    apiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    const data = await this._db.getUserOperationV07(chainId).countDocuments({
      "metaData.apiKey": apiKey,
      creationTime: { $gte: startTime, $lte: endTime },
    });
    return data;
  }
}
