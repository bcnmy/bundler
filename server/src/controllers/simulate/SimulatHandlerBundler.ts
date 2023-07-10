import { NextFunction, Request, Response } from 'express';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../../middleware';
import { simulateAndValidateBundlerTransaction } from './SimulateBundlerTransaction';
import { parseError } from '../../../../common/utils';

export const simulateBundlerTransaction = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method, id } = req.body;
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
      case EthMethodType.GAS_AND_GAS_PRICES:
        response = {
          code: STATUSES.SUCCESS,
          message: `Method: ${method} does not require simulation`,
        };
        break;
      default:
        response = {
          jsonrpc: '2.0',
          id: id || 1,
          error: {
            code: STATUSES.BAD_REQUEST,
            message: `Method: ${method} not supported by Bundler`,
          },
        };
    }

    if (!response) {
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: 'Internal Server Error',
        },
      });
    }
    if ((response as any).code !== STATUSES.SUCCESS) {
      return res.status(STATUSES.BAD_REQUEST).send({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: (response as any).code,
          message: (response as any).message,
        },
      });
    }
    return next();
  } catch (error) {
    const { id } = req.body;
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server Error: ${parseError(error)}`,
      },
    });
  }
};
