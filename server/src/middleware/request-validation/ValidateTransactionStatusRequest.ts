/* eslint-disable import/no-import-module-exports */
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/logger';
import { transactionStatusSchema } from '../../routes/relay/relay.schema';
import { STATUSES } from '../RequestHelpers';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const validateTransactionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = transactionStatusSchema.validate(req.query);
    const valid = error == null;

    if (valid) {
      return next();
    }
    const { details } = error;
    const message = details.map((i) => i.message).join(',');
    return res.status(422).json({
      code: 422,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(STATUSES.BAD_REQUEST).send({
      code: STATUSES.BAD_REQUEST,
      error: e.errors,
    });
  }
};
