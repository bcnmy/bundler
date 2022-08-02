import mongoose from 'mongoose';

export class Mongo {
  dbUrl: string;

  supportedNetworks: [] = [];

  constructor(dbUrl: string) {
    this.dbUrl = dbUrl;
  }

  connect = async () => {
    try {
      await mongoose.connect(this.dbUrl);
    } catch (error) {
      console.log('error while connecting to mongo db');
    }
  };

  static close() {
    return mongoose.disconnect();
  }
}
