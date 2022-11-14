import mongoose, { Mongoose } from 'mongoose';
import { config } from '../../../config';
import { logger } from '../../log-config';
import { parseError } from '../../utils';
import { IDBService } from '../interface/IDBService';
import { BlockchainTransactionsMap, BlockchainTransactionsMapType } from './models';

const log = logger(module);
export class Mongo implements IDBService {
  private static instance: Mongo;

  private client: Mongoose | null;

  private constructor() {
    this.client = null;
  }

  public static getInstance(): Mongo {
    if (!Mongo.instance) {
      Mongo.instance = new Mongo();
    }
    return Mongo.instance;
  }

  connect = async () => {
    const dbUrl = config.dataSources.mongoUrl || '';
    if (!dbUrl) {
      throw new Error('Database url not provided');
    }
    try {
      if (!this.client) {
        this.client = await mongoose.connect(dbUrl, {
          dbName: 'relayer-node-service',
        });
      }
      log.info('Connected to db');
    } catch (error) {
      log.info('error while connecting to mongo db');
      parseError(error);
    }
  };

  getBlockchainTransaction(networkId: number): BlockchainTransactionsMapType[number] {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId)) throw new Error(`Network Id ${networkId} is not supported`);
    return BlockchainTransactionsMap[networkId];
  }

  close() {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    return this.client.disconnect();
  }
}
