import { STATUSES } from '../../middleware';

import { getMetaApiListPerDappKey } from '../../utils/cache-utils';
import { cache } from '../caching';

import { logger } from '../../../log-config';
import { IDaoUtils, MetaApiType, SmartContractType } from '../../dao-utils/interface/dao-utils';
import { parseError } from '../../utils/util';

const log = logger(module);

export const getMetaApis = async (
  dappId: string,
  daoUtilsInstance: IDaoUtils,
  smartContracts?: SmartContractType[],
) => {
  try {
    log.info(`Getting apis for dappId: ${dappId}`);
    let apis:Array<MetaApiType> = [];
    const apiListFromCache = await cache.get(getMetaApiListPerDappKey(dappId));
    if (apiListFromCache && typeof apiListFromCache === 'string') {
      if (smartContracts && smartContracts.length > 0) {
        const allApisList: Array<MetaApiType> = JSON.parse(
          apiListFromCache,
        );
        smartContracts.forEach((smartContract: SmartContractType) => {
          const api = allApisList.find(
            (metaApi) => metaApi.contractId.toString() === smartContract._id?.toString(),
          );
          if (api) {
            apis.push(api);
          }
        });
      } else {
        apis = JSON.parse(apiListFromCache);
      }
    } else {
      const listApis = await daoUtilsInstance.getMetaApisByDappId(dappId);
      if (listApis.length === 0) {
        return {
          log: 'Zero apis registered',
          code: STATUSES.SUCCESS,
          data: {
            apis: [],
          },
        };
      }

      listApis.forEach(async (api: MetaApiType) => {
        const apisObj = {
          _id: api._id,
          name: api.name,
          dappId: api.dappId,
          contractId: api.contractId,
          apiId: api.apiId,
          url: api.url,
          method: api.method,
          contractAddress: api.contractAddress,
          methodType: api.methodType,
          apiType: api.apiType,
          createdOn: api.createdOn,
          createdBy: api.createdBy,
          updatedOn: api.updatedOn,
          conditions: api.conditions || [],
        };
        apis.push(apisObj);
      });

      if (apis.length > 0) {
        await cache.set(
          getMetaApiListPerDappKey(dappId),
          JSON.stringify(apis),
        );
      }
    }

    return {
      log: 'Apis fetched successfully',
      flag: STATUSES.ACTION_COMPLETE,
      data: {
        apis,
      },
    };
  } catch (error) {
    log.error(parseError(error));
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Meta Apis could not be listed with error: ${parseError(error)}`,
    };
  }
};
