import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../log-config';
import { sendOne, sendResponse, STATUSES } from '../../middleware';
import { checkIfAuthTokenIsValid } from '../../middleware/check-auth-token-is-valid';
import {
  daoUtilsInstance,
} from '../../service-manager';
import { gnosisWhitelistTargetContracts } from '../../services/sdk';
import { parseError } from '../../utils/util';

const log = logger(module);

export async function gnosisWhitelistTarget(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.headers && req.headers.apiKey && req.headers.authToken) {
      const { apiKey, authToken } = req.headers;
      const { contractAddresses } = req.body;
      const {
        isAuthTokenValid,
        dappId,
      } = await checkIfAuthTokenIsValid(apiKey as string, authToken as string);

      if (isAuthTokenValid && dappId) {
        log.info(`Authentication successful for apiKey: ${apiKey} and authToken: ${authToken}`);
        const result = await gnosisWhitelistTargetContracts(
          dappId,
          contractAddresses,
          daoUtilsInstance,
        );

        if (result.error) {
          const code = result.code || STATUSES.INTERNAL_SERVER_ERROR;
          return sendResponse(
            res,
            result,
            code,
          );
        }
        return sendOne(res, result);
      }
      log.info(`Error in authentication for apiKey: ${apiKey} and authToken: ${authToken}`);
      return {
        error: `Error in authentication for apiKey: ${apiKey} and authToken: ${authToken}`,
        code: STATUSES.UNAUTHORIZED,
      };
    }
    return sendResponse(res, {
      log: 'Not Authorized, apiKey or authToken not found in headers',
      code: STATUSES.UNAUTHORIZED,
    }, STATUSES.UNAUTHORIZED);
  } catch (error) {
    log.error(`Error in gnosis wallet transaction contract ${parseError(error)}`);
    return next(error);
  }
}
