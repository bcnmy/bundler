import { IEVMAccount } from "../../../relayer/account";
import { IRelayerManager } from "../../../relayer/relayer-manager";
import { ICacheService } from "../../cache";
import { IDBService } from "../../db";
import { GasPriceService } from "../../gas-price";
import { EVMNetworkService } from "../../network";
import { BundlerSimulationService, BundlerSimulationServiceV07 } from "../../simulation";
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
  gasPriceServiceMap: {
    [chainId: number]: GasPriceService;
  };
  bundlerSimulationServiceMap: {
    [chainId: number]: BundlerSimulationService;
  };
  bundlerSimulationServiceMapV07: {
    [chainId: number]: BundlerSimulationServiceV07;
  };
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
