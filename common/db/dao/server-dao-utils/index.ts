import { Mongo } from '../../mongo/models/blockchain_transactions/mongo';
import { IDaoUtils } from './interface/dao-utils';

export class DaoUtils implements IDaoUtils {
  db;

  constructor(dbInstance: Mongo) {
    this.db = dbInstance;
  }
}
