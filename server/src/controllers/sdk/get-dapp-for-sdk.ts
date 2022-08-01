import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../log-config';
import { sendOne, sendResponse, STATUSES } from '../../middleware/requests-helpers';
import {
  daoUtilsInstance,
} from '../../service-manager';
import { cache } from '../../services/caching';
import { getMetaApis, getSmartContracts } from '../../services/sdk';
import { getDappByApiKey } from '../../utils/cache-utils';
import { parseError } from '../../utils/util';

const log = logger(module);

async function checkIfDappExistsByApiKey(apiKey: string) {
  try {
    let isDappAuthorised = false;
    let dapp;
    const dappByApiKeyCache = await cache.get(getDappByApiKey(apiKey));

    if (dappByApiKeyCache && typeof dappByApiKeyCache === 'string') {
      log.info(`Dapp with apiKey: ${apiKey} found in cache`);
      const dappByApiKey = JSON.parse(dappByApiKeyCache);
      dapp = dappByApiKey;
      isDappAuthorised = true;
    } else {
      const dappByApiKeyDb = await daoUtilsInstance.findOneDappByApiKey(apiKey);

      if (dappByApiKeyDb) {
        log.info(`Dapp with apiKey: ${apiKey} found in db`);
        dapp = dappByApiKeyDb;
        isDappAuthorised = true;
        await cache.set(getDappByApiKey(apiKey), JSON.stringify(dappByApiKeyDb));
      }
    }
    return {
      isDappAuthorised,
      dapp,
    };
  } catch (error) {
    log.error(parseError(error));
    return {
      isDappAuthorised: false,
      dappId: null,
    };
  }
}

export async function getDappForSdk(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.headers && req.headers['x-api-key'] && typeof req.headers['x-api-key'] === 'string') {
      const apiKey = req.headers['x-api-key'];
      const { isDappAuthorised, dapp } = await checkIfDappExistsByApiKey(apiKey);

      if (isDappAuthorised) {
        const { contractAddresses } = req.query;

        const dappId = dapp._id;

        const smartContractsResult = await getSmartContracts(
          dappId,
          daoUtilsInstance,
          contractAddresses as string[] | undefined,
        );

        if (smartContractsResult.error) {
          const code = smartContractsResult.code || STATUSES.INTERNAL_SERVER_ERROR;
          return sendResponse(
            res,
            smartContractsResult,
            code,
          );
        }

        const smartContracts = smartContractsResult.data?.smartContracts;

        const metaApisResult = await getMetaApis(dappId, daoUtilsInstance, smartContracts);

        if (metaApisResult.error) {
          const code = metaApisResult.code || STATUSES.INTERNAL_SERVER_ERROR;
          return sendResponse(
            res,
            metaApisResult,
            code,
          );
        }

        const dappData = dapp;
        const smartContractsData = smartContractsResult.data?.smartContracts;
        const metaApisData = metaApisResult.data?.apis;

        const result = {
          log: `Dapp and smart contract data fetched for dappId: ${dappId}`,
          code: STATUSES.SUCCESS,
          data: {
            dapp: dappData,
            smartContracts: smartContractsData,
            metaApis: metaApisData,
          },
        };
        return sendOne(res, result);
      }
      return sendResponse(res, {
        log: 'Not Authorized, please check apiKey',
        code: STATUSES.UNAUTHORIZED,
      }, STATUSES.UNAUTHORIZED);
    }
    return sendResponse(res, {
      log: 'Not Authorized, apiKey not found in headers',
      code: STATUSES.UNAUTHORIZED,
    }, STATUSES.UNAUTHORIZED);
  } catch (error) {
    log.error(`Error in get dapp from sdk ${parseError(error)}`);
    return next(error);
  }
}
