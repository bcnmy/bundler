import mongoose from 'mongoose';
import { BlockchainTransactionsMap } from './models/blockchain_transactions';

export class Mongo {
  dbUrl: string;

  supportedNetworks: Array<number> = [];

  constructor(dbUrl: string) {
    this.dbUrl = dbUrl;
  }

  connect = async () => {
    try {
      await mongoose.connect(this.dbUrl);
      console.log('connected to db');
    } catch (error) {
      console.log('error while connecting to mongo db');
      console.log(error);
    }
  };

  public getBlockchainTransaction(networkId: number) {
    if (!this.supportedNetworks.includes(networkId)) throw new Error(`Network Id ${networkId} is not supported`);
    return BlockchainTransactionsMap[networkId];
  }

  static close() {
    return mongoose.disconnect();
  }
}
