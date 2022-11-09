import { IEVMAccount } from '../../../relayer/src/services/account';
import { IRelayerManager } from '../../../relayer/src/services/relayer-manager';
import { ICacheService } from '../../cache';
import { EVMNetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';

export type StatusServiceParamsType = {
  cacheService: ICacheService,
  networkServiceMap: Record<number, EVMNetworkService>
  evmRelayerManagerMap: Record<string, {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  }>
};

export type RedisStatusResponseType = {
  active: boolean,
  lastUpdated: string,
};

export type TokenPriceStatusResponseType = {
  active: boolean,
  data?: {
    tokenPrice: Record<string, number>
  },
  lastUpdated: string,
};

export type NetworkServiceStatusResponseType = { [key: number]: {
  active: boolean,
  lastUpdated: string,
} };
