import { ICacheService } from '../../cache';

export type HealthServiceParamsType = {
  cacheService: ICacheService,
  networkServiceMap: Map<string, any>,
};
