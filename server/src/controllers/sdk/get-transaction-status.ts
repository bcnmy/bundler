import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../log-config';
import { sendOne, sendResponse, STATUSES } from '../../middleware/requests-helpers';
import {
  daoUtilsInstance,
} from '../../service-manager';
import { cache } from '../../services/caching';
import { getTransactionStatusById } from '../../services/sdk';
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

export async function getTransactionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.headers && req.headers['x-api-key'] && typeof req.headers['x-api-key'] === 'string') {
      const apiKey = req.headers['x-api-key'];
      const { isDappAuthorised, dapp } = await checkIfDappExistsByApiKey(apiKey);

      if (isDappAuthorised) {
        const transactionId = req.query.transactionId as string;

        const { networkId } = dapp;

        const transactionStatusResult = await getTransactionStatusById(
          parseInt(networkId, 10),
          transactionId,
          daoUtilsInstance,
        );

        if (transactionStatusResult.error) {
          const code = transactionStatusResult.code || STATUSES.INTERNAL_SERVER_ERROR;
          return sendResponse(
            res,
            transactionStatusResult,
            code,
          );
        }
        let response;
        if (transactionStatusResult) {
          if (transactionStatusResult.data) {
            response = {
              log: transactionStatusResult.log,
              code: transactionStatusResult.code,
              data: {
                status: transactionStatusResult.data.status,
                receipt: transactionStatusResult.data.receipt,
              },
            };
          } else {
            response = transactionStatusResult;
          }
        }
        const result = {
          flag: STATUSES.SUCCESS,
          ...response,
        };
        return sendOne(res, result);
      }
      return sendResponse(res, {
        log: 'Not Authorized, please check apiKey',
        flag: STATUSES.UNAUTHORIZED,
      }, STATUSES.UNAUTHORIZED);
    }
    return sendResponse(res, {
      log: 'Not Authorized, apiKey not found in headers',
      flag: STATUSES.UNAUTHORIZED,
    }, STATUSES.UNAUTHORIZED);
  } catch (error) {
    log.error(`Error in get transaction status from sdk ${parseError(error)}`);
    return next(error);
  }
}
