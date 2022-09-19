import { NextFunction, Request, Response } from 'express';
import { TransactionType } from '../../../../common/types';
import { logger } from '../../../../common/log-config';
import { validateRequest } from './ValidateRequest';
import { scwRequestSchema, aaRequestSchema, crossChainRequestSchema } from '../../routes/relay/relay.schema';

const log = logger(module);

export const validateRelayRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { transactionType } = req.body;
    switch (transactionType) {
      case TransactionType.SCW:
        validateRequest(scwRequestSchema);
        break;
      case TransactionType.AA:
        validateRequest(aaRequestSchema);
        break;
      case TransactionType.CROSS_CHAIN:
        validateRequest(crossChainRequestSchema);
        break;
      default:
        return res.status(400).send({
          code: 400,
          message: 'Wrong transaction type sent in request',
        });
    }

    return next();
  } catch (e: any) {
    log.error(e);
    return res.status(400).send({
      code: 400,
      message: e.errors,
    });
  }
};
