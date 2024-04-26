/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-import-module-exports */
import mongoose, { Mongoose } from "mongoose";
import { config } from "../../../config";
import { getLogger } from "../../logger";
import { IDBService } from "../interface/IDBService";
import {
  BlockchainTransactionsMap,
  BlockchainTransactionsMapType,
  UserOperationsMap,
  UserOperationsMapType,
  UserOperationsStateMap,
  UserOperationsStateMapType,
} from "./models";

const log = getLogger(module);

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
      throw new Error("Not connected to db");
    }

    try {
      const collections = await this.client.connection.db
        .listCollections()
        .toArray();
      for (const collection of collections) {
        const collectionName = collection.name;
        const collectionObject =
          this.client.connection.db.collection(collectionName);

        if (collectionName.startsWith("blockchaintransactions")) {
          await this.createIndexes(
            collectionObject,
            { creationTime: -1, transactionId: 1 },
            { creationTime: -1, transactionId: 1, transactionHash: 1 },
            collectionName,
          );
        } else if (collectionName.startsWith("useroperations")) {
          await this.createIndexes(
            collectionObject,
            { creationTime: -1, transactionId: 1 },
            { creationTime: -1, transactionId: 1, userOpHash: 1 },
            collectionName,
          );
        }
      }
    } catch (error) {
      log.error("Error while creating indexes");
      log.error(error);
      process.exit();
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async createIndexes(
    collectionObject: any,
    compoundIndexOne: object,
    compoundIndexTwo: object,
    collectionName: string,
  ): Promise<void> {
    const indexes = await collectionObject.indexes();
    log.info(indexes);

    const compoundIndexKeyOne = Object.entries(compoundIndexOne)
      .map(([key, value]) => `${key}_${value}`)
      .join("_");

    log.info(`Compund index key name ${compoundIndexKeyOne}`);
    const compoundIndexExistsOne = indexes.some(
      (index: any) => index.name === compoundIndexKeyOne,
    );

    if (!compoundIndexExistsOne) {
      await collectionObject.createIndex(compoundIndexOne, {
        background: true,
      });
      log.info(
        `Compound index ${compoundIndexKeyOne} created for collection ${collectionName}`,
      );
    } else {
      log.info(
        `Compound index ${compoundIndexKeyOne} found for collection ${collectionName}`,
      );
    }

    const compoundIndexKeyTwo = Object.entries(compoundIndexTwo)
      .map(([key, value]) => `${key}_${value}`)
      .join("_");

    log.info(`Compund index key name ${compoundIndexKeyTwo}`);
    const compoundIndexExistsTwo = indexes.some(
      (index: any) => index.name === compoundIndexKeyTwo,
    );

    if (!compoundIndexExistsTwo) {
      await collectionObject.createIndex(compoundIndexTwo, {
        background: true,
      });
      log.info(
        `Compound index ${compoundIndexKeyTwo} created for collection ${collectionName}`,
      );
    } else {
      log.info(
        `Compound index ${compoundIndexKeyTwo} found for collection ${collectionName}`,
      );
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
    const dbUrl = config.dataSources.mongoUrl || "";
    if (!dbUrl) {
      throw new Error("Database url not provided");
    }
    try {
      if (!this.client) {
        this.client = await mongoose.connect(dbUrl, {
          dbName: "relayer-node-service",
        });
      }
      log.info("Connected to db");
    } catch (error) {
      log.error("error while connecting to mongo db");
      log.error(error);
    }
  };

  /**
   * Method returns blockchain transactions model for a given chain id
   * @param networkId
   * @returns blockchain transactions model for a given chain id
   */
  getBlockchainTransaction(
    networkId: number,
  ): BlockchainTransactionsMapType[number] {
    if (!this.client) {
      throw new Error("Not connected to db");
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId))
      throw new Error(`Network Id ${networkId} is not supported`);
    return BlockchainTransactionsMap[networkId];
  }

  /**
   * Method returns user operation model for a given chain id
   * @param networkId
   * @returns user operation model for a given chain id
   */
  getUserOperation(networkId: number): UserOperationsMapType[number] {
    if (!this.client) {
      throw new Error("Not connected to db");
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId))
      throw new Error(`Network Id ${networkId} is not supported`);
    return UserOperationsMap[networkId];
  }

  /**
   * Method returns user operation state model for a given chain id
   * @param networkId
   * @returns user operation state model for a given chain id
   */
  getUserOperationState(networkId: number): UserOperationsStateMapType[number] {
    if (!this.client) {
      throw new Error("Not connected to db");
    }
    const supportedNetworks: number[] = config.supportedNetworks || [];
    if (!supportedNetworks.includes(networkId))
      throw new Error(`Network Id ${networkId} is not supported`);
    return UserOperationsStateMap[networkId];
  }

  isConnected(): boolean {
    if (this.client) {
      return this.client.connection.readyState === 1;
    }
    return false;
  }

  close() {
    if (!this.client) {
      throw new Error("Not connected to db");
    }
    return this.client.disconnect();
  }
}
