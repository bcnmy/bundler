import { ICacheService } from '../cache';
import { IHealthService } from './interface/IHealthService';
import { HealthServiceParamsType } from './types';

export class HealthService implements IHealthService {
  cacheService: ICacheService;
  networkServiceMap: Map<string, any>;

  constructor(params: HealthServiceParamsType) {
    const { cacheService, networkServiceMap } = params;
    this.cacheService = cacheService;
    this.networkServiceMap = networkServiceMap;
  }

  async checkRedis(): Promise<StatusResponseType> {
    const result = await this.cacheService.get('health');
    return result === 'ok';
  }

  // async checkMongo(): Promise<boolean> {
  //   return true;
  // }

  async checkNetworkService(): Promise<StatusResponseType> {
    return true;
  }

  async checkTokenPrice(): Promise<StatusResponseType> {
    return true;
  }
}
