import { Mongo } from '../../mongo/models/blockchain_transactions/mongo';
import { logger } from '../../../log-config';
import { IDaoUtils } from './interface/dao-utils';

const log = logger(module);
export class DaoUtils implements IDaoUtils {
  private _db;

  constructor(dbInstance: Mongo) {
    this._db = dbInstance;
  }

  async findPendingTransactions(networkId: number) {
    const data = await this._db.getBlockchainTransaction(networkId).find({
      status: 'PENDING',
    });
    return data;
  }

  async getTransaction(query: object, networkId: number) {
    try {
      const data = await this._db.getBlockchainTransaction(networkId)
        .findOne(query).sort({ creationTime: -1 });
      return data || { error: 'no data' };
    } catch (error) {
      log.info('error while fetching transaction data from db');
      log.error(error);
    }
    return {
      error: 'no data',
    };
  }

  async saveTransaction(
    networkId: number,
    data: object,
  ) {
    try {
      await this._db.getBlockchainTransaction(networkId).insertMany([data]);
    } catch (error) {
      log.info('error while saving transaction data');
      log.error(error);
    }
  }

  async updateTransaction(
    query: object,
    networkId: number,
    data: object,
  ) {
    try {
      await this._db.getBlockchainTransaction(networkId).updateOne(query, {
        $set: data,
      });
    } catch (error) {
      log.info('error while saving transaction data in db');
      log.error(error);
    }
  }
}
