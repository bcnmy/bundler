import { IRPCErrorDAO } from '../interface';
import { IRPCError, Mongo } from '../mongo';

export class RPCErrorDAO implements IRPCErrorDAO {
  private _db: Mongo;

  constructor() {
    this._db = Mongo.getInstance();
  }

  /**
   * Method saves rpc error data
   * @param chainId
   * @param transactionData
   */
  async save(rpcErrorData: IRPCError): Promise<void> {
    await this._db.getRPCError().insertMany([rpcErrorData]);
  }
}
