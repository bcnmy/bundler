import { config } from '../../config';
import { IEVMAccount } from '../../relayer/src/services/account';
import { IRelayerManager } from '../../relayer/src/services/relayer-manager';
import { ICacheService } from '../cache';
import { EVMNetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { getTokenPriceKey } from '../utils';
import { IStatusService } from './interface/IStatusService';
import {
  StatusServiceParamsType,
  RedisStatusResponseType,
  TokenPriceStatusResponseType,
  NetworkServiceStatusResponseType,
} from './types';

export class StatusService implements IStatusService {
  cacheService: ICacheService;

  networkServiceMap: Record<number, EVMNetworkService>;

  evmRelayerManagerMap: {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  } = {};

  constructor(params: StatusServiceParamsType) {
    const { cacheService, networkServiceMap, evmRelayerManagerMap } = params;
    this.cacheService = cacheService;
    this.networkServiceMap = networkServiceMap;
    this.evmRelayerManagerMap = evmRelayerManagerMap;
  }

  async checkRedis(): Promise<RedisStatusResponseType> {
    try {
      await this.cacheService.set('health', 'ok');
      const result = await this.cacheService.get('health');
      return {
        active: result === 'ok',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        active: false,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  // async checkMongo(): Promise<boolean> {
  //   return true;
  // }

  async checkRelayerManager(): Promise<any> {
    // iterate over the 2d keys of relayer manager map of name and chain id
    // for each key, check if the relayer manager is active by making a call to the network
    // return the result
    const relayerManagerStatus: any = {};
    const relayerManagerNameKeys: string[] = Object.keys(this.evmRelayerManagerMap);
    for (const relayerManagerNameKey of relayerManagerNameKeys) {
      relayerManagerStatus[relayerManagerNameKey] = {};
      // const chainIdKeys: string[] = Object.keys(
      // this.evmRelayerManagerMap[relayerManagerNameKey]);
      // for (const chainIdKey of chainIdKeys) {
      //   const relayerManager = this.evmRelayerManagerMap[relayerManagerNameKey][chainIdKey];
      //   // get list of relayers from relayer manager
      //   const relayers = relayerManager.getRelayers();
      // }
    }
  }

  async checkNetworkService(): Promise<NetworkServiceStatusResponseType> {
    // iterate over the keys of network service map
    // for each key, check if the network service is active by making a call to the network
    // return the result
    const networkServiceStatus: NetworkServiceStatusResponseType = {};
    const networkIdKeys: string[] = Object.keys(this.networkServiceMap);
    for (const networkIdKey of networkIdKeys) {
      const networkId = parseInt(networkIdKey, 10);
      const networkService = this.networkServiceMap[networkId];
      try {
        // eslint-disable-next-line no-await-in-loop
        await networkService.getBalance(config.zeroAddress);
        networkServiceStatus[networkId] = {
          active: true,
          lastUpdated: new Date().toISOString(),
        };
      } catch (error) {
        networkServiceStatus[networkId] = {
          active: false,
          lastUpdated: new Date().toISOString(),
        };
      }
    }
    return networkServiceStatus;
  }

  async checkTokenPrice(): Promise<TokenPriceStatusResponseType> {
    try {
      const result = await this.cacheService.get(getTokenPriceKey());
      if (result !== null) {
        return {
          active: true,
          data: {
            tokenPrice: JSON.parse(result),
          },
          lastUpdated: new Date().toISOString(),
        };
      }
      return {
        active: false,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        active: false,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}
