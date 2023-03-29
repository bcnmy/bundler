import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../RequestHelpers';
import { authenticateFallbackGasTankDepositRequest } from './helpers/FallbackGasTankDeposit';

const log = logger(module);

export const authenticateRelayRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    const { encryptedData } = req.headers;
    if (encryptedData) {
      return res.status(STATUSES.UNAUTHORIZED).send({
        code: STATUSES.UNAUTHORIZED,
        error: JSON.stringify('Encrypted data string cannot be undefined'),
      });
    }
    let authenticationResponse;
    switch (method) {
      case TransactionMethodType.FALLBACK_GASTANK_DEPOSIT:
        authenticationResponse = await authenticateFallbackGasTankDepositRequest(
          encryptedData as string,
        );
        break;
      default:
        return next();
    }

    if (!authenticationResponse.isAuthenticated) {
      return res.status(STATUSES.UNAUTHORIZED).send({
        code: STATUSES.UNAUTHORIZED,
        error: JSON.stringify(authenticationResponse.authenticationMessage),
      });
    }
    return next();
  } catch (e: any) {
    log.error(e);
    return res.status(STATUSES.UNAUTHORIZED).send({
      code: STATUSES.UNAUTHORIZED,
      error: JSON.stringify(e),
    });
  }
};
