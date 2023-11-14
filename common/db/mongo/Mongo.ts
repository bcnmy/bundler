/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-import-module-exports */
import mongoose, { Model, Mongoose, Collection, Document } from 'mongoose';
import { config } from '../../../config';
import { logger } from '../../logger';
import { IDBService } from '../interface/IDBService';
import {
  BlockchainTransactionsMap,
  BlockchainTransactionsMapType,
  UserOperationsMap,
  UserOperationsMapType,
} from './models';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });


export class Mongo implements IDBService {
  private static instance: Mongo;

  private client: Mongoose | null;

  private constructor() {
    this.client = null;
  }

  /**
   * Method to create an index on the 'transactionId' field in descending order
   * for all collections in the database, if it doesn't already exist.
   */
  async createTransactionIdIndexes(): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected to db');
    }

    try {
      const collections = await this.client.connection.db.listCollections().toArray();
      for (const collection of collections) {
        const collectionName = collection.name;
        const collectionObject = this.client.connection.db.collection(collectionName);

        if (collectionName.startsWith('blockchaintransactions')) {
          await this.createIndexes(collectionObject,
            { transactionId: 1 },
            { transactionId: 1, transactionHash: 1 },
            collectionName);
        } else if (collectionName.startsWith('useroperations')) {
          await this.createIndexes(collectionObject,
            { transactionId: 1 },
            { transactionId: 1, userOpHash: 1 },
            collectionName);
        }
      }
    } catch (error) {
      logger.error('Error while creating indexes');
      logger.error(error);
      process.exit();
    }
  }

  async createIndexes(
    collectionObject: any,
    singleIndex: object,
    compoundIndex: object,
    collectionName: string
  ): Promise<void> {
    const indexes = await collectionObject.indexes();
    const singleIndexExists = indexes.some((index: any) => 'transactionId' in index.key && index.key.transactionId === 1);

    if (!singleIndexExists) {
      await collectionObject.createIndex(singleIndex, { background: true });
      logger.info(`Single index on 'transactionId' created for collection ${collectionName}`);
    } else {
      logger.info(`Single index on 'transactionId' found for collection ${collectionName}`);
    }

    const compoundIndexKey = Object.keys(compoundIndex).join('_');
    const compoundIndexExists = indexes.some((index: any) => index.name === compoundIndexKey);

    if (!compoundIndexExists) {
      await collectionObject.createIndex(compoundIndex, { background: true });
      logger.info(`Compound index ${compoundIndexKey} created for collection ${collectionName}`);
    } else {
      logger.info(`Compound index ${compoundIndexKey} found for collection ${collectionName}`);
    }
  }

  /**
   * Method creates and returns new mongo instance
   * @returns mongo instance
   */
  public static getInstance(): Mongo {
    if (!Mongo.instance) {
      Mongo.instance = new Mongo();
    }
    return Mongo.instance;
  }

  /**
   * Method connects to a mongo instance
   */
  connect = async () => {
    const dbUrl = config.dataSources.mongoUrl;
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
      log.error('error while connecting to mongo db');
      log.error(error);
    }
  };

  /**
   * Method returns blockchain transactions model for a given chain id
   * @param networkId
   * @returns blockchain transactions model for a given chain id
   */
  getBlockchainTransaction(networkId: number): BlockchainTransactionsMapType[number] {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId)) throw new Error(`Network Id ${networkId} is not supported`);
    return BlockchainTransactionsMap[networkId];
  }

  /**
   * Method returns user operation model for a given chain id
   * @param networkId
   * @returns user operation model for a given chain id
   */
  getUserOperation(networkId: number): UserOperationsMapType[number] {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId)) throw new Error(`Network Id ${networkId} is not supported`);
    return UserOperationsMap[networkId];
  }

  isConnected(): boolean {
    if (this.client) {
      return this.client.connection.readyState === 1;
    }
    return false;
  }

  close() {
    if (!this.client) {
      throw new Error('Not connected to db');
    }
    return this.client.disconnect();
  }
}
