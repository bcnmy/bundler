import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { TransactionMethodType } from '../../../../common/types';
import { aaRequestSchema, gaslessFallbackRequestSchema, scwRequestSchema } from '../../routes/relay/relay.schema';

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
      case TransactionMethodType.GASLESS_FALLBACK:
        validationResponse = gaslessFallbackRequestSchema.validate(req.body);
        break;
      default:
        return res.status(StatusCodes.BAD_REQUEST).send({
          code: StatusCodes.BAD_REQUEST,
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
    return res.status(StatusCodes.BAD_REQUEST).json({
      code: StatusCodes.BAD_REQUEST,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(e),
    });
  }
};
