export class Mongo {
  db: Database;

  supportedNetworks: [] = [];

  constructor(supportedNetworks: []) {
    const dbUrl = process.env.MONGO_URL || '';

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
