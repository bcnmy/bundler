import { STATUSES } from '../../middleware';
import { getDappByApiKey, getDappByApiIdKey } from '../../utils/cache-utils';
import { cache } from '../caching';
import { ApiKeyAuthResponseType, ErrorType } from './interface/native-api';
import type { NativeAPI } from '.';

// returns dapp data after validation
export async function apiKeyAuth(
  this: NativeAPI,
  apiKey: string,
  apiId: string,
): Promise<ApiKeyAuthResponseType | ErrorType> {
  const dappByApiKeyInCache = await cache.get(getDappByApiKey(apiKey));
  let dappByApiKey;
  if (dappByApiKeyInCache) {
    dappByApiKey = JSON.parse(dappByApiKeyInCache);
  } else {
    dappByApiKey = await this.daoUtils.findOneDappByApiKey(apiKey);
    if (!dappByApiKey) {
      return {
        error: 'Not a valid registered dapp',
        code: STATUSES.BAD_REQUEST,
      };
    }
    await cache.set(getDappByApiKey(apiKey), JSON.stringify(dappByApiKey));
  }
  const dappIdByApiKey = dappByApiKey._id;

  const dappByApiIdInCache = await cache.get(getDappByApiIdKey(apiId));
  let dappByApiId;
  if (dappByApiIdInCache) {
    dappByApiId = JSON.parse(dappByApiIdInCache);
  } else {
    dappByApiId = await this.daoUtils.findOneDappByApiId(apiId);
    if (!dappByApiId) {
      return {
        error: 'Not a valid registered dapp',
        code: STATUSES.BAD_REQUEST,
      };
    }
    await cache.set(getDappByApiIdKey(apiKey), JSON.stringify(dappByApiId));
  }
  const dappIdByApiId = dappByApiId.dappId;
  if (dappIdByApiKey.toString() !== dappIdByApiId.toString()) {
    return {
      error: 'Api key authentication failed. Mismatch for apiId and apiKey',
      code: STATUSES.BAD_REQUEST,
    };
  }
  const {
    _id: dappId, active, networkId, createdBy, enableWhiteList, allowedDomains,
    dappLimit,
    userLimit,
    apiLimit,
    dappLimitStatus,
    userLimitStatus,
    apiLimitStatus,
  } = dappByApiKey;
  return {
    networkId,
    createdBy,
    dappId,
    active,
    enableWhiteList,
    allowedDomains,
    dappLimit,
    userLimit,
    apiLimit,
    dappLimitStatus,
    userLimitStatus,
    apiLimitStatus,
  };
}
