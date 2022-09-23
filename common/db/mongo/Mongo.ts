import mongoose, { Mongoose } from 'mongoose';
import { config } from '../../../config';
import { IDBService } from '../interface/IDBService';
import { BlockchainTransactionsMap } from './models';

export class Mongo implements IDBService {
  private static instance: Mongo;

  private client: Mongoose | null;

  private constructor() {
    this.client = null;
  }

  public static getInstance(): Mongo {
    // TODO: Add lock
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
      console.log('Connected to db');
    } catch (error) {
      console.log('error while connecting to mongo db');
      console.log(error);
    }
  };

  getBlockchainTransaction(networkId: number) {
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
