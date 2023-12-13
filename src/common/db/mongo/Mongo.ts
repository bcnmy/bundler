/* eslint-disable import/no-import-module-exports */
import mongoose, { Mongoose } from "mongoose";
import { config } from "../../../config";
import { logger } from "../../logger";
import { IDBService } from "../interface/IDBService";
import {
  BlockchainTransactionsMap,
  BlockchainTransactionsMapType,
  UserOperationsMap,
  UserOperationsMapType,
  UserOperationsStateMap,
  UserOperationsStateMapType,
} from "./models";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class Mongo implements IDBService {
  private static instance: Mongo;

  private client: Mongoose | null;

  private constructor() {
    this.client = null;
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
