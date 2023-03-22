import { NextFunction, Request, Response } from 'express';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../../middleware';
import { simulateAndValidateBundlerTransaction } from './SimulateBundlerTransaction';

export const simulateBundlerTransaction = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    let response = null;
    switch (method) {
      case TransactionMethodType.BUNDLER:
        response = await simulateAndValidateBundlerTransaction(req);
        break;
      case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      case EthMethodType.GET_USER_OPERATION_BY_HASH:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      case EthMethodType.GET_USER_OPERATION_RECEIPT:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      case EthMethodType.SUPPORTED_ENTRY_POINTS:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      case EthMethodType.CHAIN_ID:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      default:
        response = {
          code: STATUSES.BAD_REQUEST,
          message: `Method not supported: ${method}`,
        };
    }

    if (!response) {
      // TODO // change response
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: 'Response not received from simulation service',
      });
    }
    if ((response as any).code !== STATUSES.SUCCESS) {
      return res.status((response as any).code).send({
        code: (response as any).code,
        error: (response as any).message,
      });
    }
    return next();
  } catch (error) {
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal server error: ${JSON.stringify(error)}`,
    });
  }
};
