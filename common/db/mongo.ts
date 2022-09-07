import mongoose, { Mongoose } from 'mongoose';
import { BlockchainTransactionsMap } from './models/blockchain_transactions';

export class Mongo {
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
    const dbUrl = ''; // TODO: get from config instance;
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
    const supportedNetworks: number[] = []; // TODO: get from config instance;
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
