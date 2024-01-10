import { IEVMAccount } from "../../../relayer/account";
import { IRelayerManager } from "../../../relayer/relayer-manager";
import { ICacheService } from "../../cache";
import { IDBService } from "../../db";
import { EVMNetworkService } from "../../network";
import { EVMRawTransactionType } from "../../types";

export type StatusServiceParamsType = {
  cacheService: ICacheService;
  networkServiceMap: Record<number, EVMNetworkService>;
  evmRelayerManagerMap: {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  };
  dbInstance: IDBService;
};

export type RedisStatusResponseType = {
  active: boolean;
  lastUpdated: string;
};

export type MongoStatusResponseType = {
  active: boolean;
  lastUpdated: string;
};

export type TokenPriceStatusResponseType = {
  active: boolean;
  data?: {
    tokenPrice: Record<string, number>;
  };
  lastUpdated: string;
};

export type NetworkServiceStatusResponseType = {
  [key: number]: {
    active: boolean;
    lastUpdated: string;
  };
};
