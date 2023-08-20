import { NextFunction, Request, Response } from 'express';
import { parseError } from '../../../../common/utils';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../middleware';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import { authenticate } from './Authenticate';

export const authenticateBundlerRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method, id } = req.body;
    let response = null;
    switch (method) {
      case TransactionMethodType.BUNDLER:
        response = await authenticate(req);
        break;
      case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
        response = await authenticate(req);
        break;
      case EthMethodType.GET_USER_OPERATION_BY_HASH:
        response = await authenticate(req);
        break;
      case EthMethodType.GET_USER_OPERATION_RECEIPT:
        response = await authenticate(req);
        break;
      case EthMethodType.SUPPORTED_ENTRY_POINTS:
        response = await authenticate(req);
        break;
      case EthMethodType.CHAIN_ID:
        response = await authenticate(req);
        break;
      case EthMethodType.GAS_AND_GAS_PRICES:
        response = await authenticate(req);
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

    if (response.code === STATUSES.UNAUTHORIZED) {
      return res.send({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: BUNDLER_VALIDATION_STATUSES.UNAUTHORIZED_REQUEST,
          message: response.message,
        },
      });
    }

    req.body.bundlerRequestId = response.data?.bundlerRequestId;

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
