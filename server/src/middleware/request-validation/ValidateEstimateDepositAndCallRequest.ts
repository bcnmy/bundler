import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { estimateDepositAndCallApiSchema } from '../../routes/cross-chain/cross-chain.schema';

const log = logger(module);

export const validateEstimateDepositAndCallRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { error } = estimateDepositAndCallApiSchema.validate(req.body);
    const valid = error == null;

    if (valid) {
      return next();
    }
    const { message } = error;
    return res.status(422).json({
      code: 422,
      error: message,
    });
  } catch (e: any) {
    log.error(e);
    return res.status(400).send({
      code: 400,
      error: e.errors,
    });
  }
};