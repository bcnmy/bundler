import { Database } from '@bcnmy/db-sdk';
import { config } from '../../config';

export class Mongo {
  db: Database;

  supportedNetworks: [] = [];

  constructor(supportedNetworks: []) {
    const dbUrl = config.mongoUrl;

    this.supportedNetworks = supportedNetworks;
    this.db = new Database({
      dbUrl,
      supportedNetworks: this.supportedNetworks,
    });
  }

  connect = async () => {
    this.db.init();
  };

  close() {
    return this.db?.disconnect();
  }
}
