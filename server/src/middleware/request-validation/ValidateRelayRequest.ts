import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import {
  aaRequestSchema,
  gasAndGasPricesRequestSchema,
  scwRequestSchema,
} from '../../routes/relay/relay.schema';
import { STATUSES } from '../RequestHelpers';

const log = logger(module);

export const validateRelayRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    let validationResponse;
    switch (method) {
      case TransactionMethodType.SCW:
        validationResponse = scwRequestSchema.validate(req.body);
        break;
      case TransactionMethodType.AA:
        validationResponse = aaRequestSchema.validate(req.body);
        break;
      case EthMethodType.GAS_AND_GAS_PRICES:
        validationResponse = gasAndGasPricesRequestSchema.validate(req.body);
        break;
      default:
        return res.status(STATUSES.BAD_REQUEST).send({
          code: STATUSES.BAD_REQUEST,
          error: 'Wrong transaction type sent in validate relay request',
        });
    }
    const { error } = validationResponse;
    const valid = error == null;
    if (valid) {
      return next();
    }
    const { details } = error;
    let message;
    if (details) {
      message = details.map((i) => i.message).join(',');
    } else {
      message = error.message || error.toString();
    }
    return res.status(STATUSES.BAD_REQUEST).json({
      code: STATUSES.BAD_REQUEST,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(STATUSES.BAD_REQUEST).send({
      code: STATUSES.BAD_REQUEST,
      error: JSON.stringify(e),
    });
  }
};
