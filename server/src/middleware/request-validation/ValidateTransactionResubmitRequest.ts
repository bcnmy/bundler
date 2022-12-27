import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { transactionResubmitSchema } from '../../routes/relay/relay.schema';

const log = logger(module);

export const validateTransactionResubmit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = transactionResubmitSchema.validate(req.body);
    const valid = error == null;

    if (valid) {
      return next();
    }
    const { details } = error;
    const message = details.map((i) => i.message).join(',');
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      code: StatusCodes.UNPROCESSABLE_ENTITY,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: e.errors,
    });
  }
};
