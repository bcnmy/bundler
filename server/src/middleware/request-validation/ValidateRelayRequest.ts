import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { TransactionMethodType } from '../../../../common/types';
import { aaRequestSchema, crossChainRequestSchema, scwRequestSchema } from '../../routes/relay/relay.schema';

const log = logger(module);

export const validateRelayRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log(req);
    console.log('req.body', req.body);
    const { method } = req.body;
    switch (method) {
      case TransactionMethodType.SCW:
        await scwRequestSchema.validate({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        break;
      case TransactionMethodType.AA:
        await aaRequestSchema.validate({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        break;
      case TransactionMethodType.CROSS_CHAIN:
        await crossChainRequestSchema.validate({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        break;
      default:
        return res.status(400).send({
          code: 400,
          message: 'Wrong transaction type sent in validate relay request',
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
