import { IApi } from '@bcnmy/db-sdk/dist/schemas';
import type { NativeAPI } from '.';
import { STATUSES } from '../../middleware';
import { getMethodAPIKey } from '../../utils/cache-utils';
import { cache } from '../caching';
import { ErrorType } from './interface/native-api';

// returns api data after validation
export async function apiIdAuth(
  this: NativeAPI,
  apiId: string,
): Promise<IApi | ErrorType> {
  const apiFromCache: string = await cache.get(getMethodAPIKey(apiId));

  let api: IApi;

  if (apiFromCache) {
    api = JSON.parse(apiFromCache);
    return api;
  }

  api = await this.daoUtils.findOneApiByApiId(apiId);

  if (!api) {
    return {
      error: 'Api not found, please check apiId',
      code: STATUSES.NOT_FOUND,
    };
  }
  await cache.set(getMethodAPIKey(apiId), JSON.stringify(api));
  return api;
}
