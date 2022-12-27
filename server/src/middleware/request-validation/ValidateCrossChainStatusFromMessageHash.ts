import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { getCrossChainTransactionStatusByMessageHashSchema } from '../../routes/cross-chain/cross-chain.schema';

const log = logger(module);

export const validateCrossChainStatusFromMessageHash = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = getCrossChainTransactionStatusByMessageHashSchema.validate(req.query);
    const valid = error == null;

    if (valid) {
      return next();
    }
    const { message } = error;
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      code: StatusCodes.UNPROCESSABLE_ENTITY,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(StatusCodes.BAD_REQUEST).send({
      code: StatusCodes.BAD_REQUEST,
      error: e.errors,
    });
  }
};
