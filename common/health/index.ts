import { ICacheService } from '../cache';
import { IHealthService } from './interface/IHealthService';
import { HealthServiceParamsType } from './types';

export class HealthService implements IHealthService {
  cacheService: ICacheService;

  constructor(params: HealthServiceParamsType) {
    const { cacheService } = params;
    this.cacheService = cacheService;
  }

  async checkRedis(): Promise<boolean> {
    const result = await this.cacheService.get('health');
    return result === 'ok';
  }

  async checkMongo(): Promise<boolean> {
    return true;
  }
}
