import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import {
  bundlerEstimateUserOpGasRequestSchema,
  bundlerGetUserOpByHashRequestSchema,
  bundlerGetUserOpReceiptRequestSchema,
  bundlerSendUserOpRequestSchema,
} from '../../routes/bundle/bundle.schema';
import { STATUSES } from '../RequestHelpers';

const log = logger(module);

export const validateBundleRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    let validationResponse;
    switch (method) {
      case TransactionMethodType.AA:
        validationResponse = bundlerSendUserOpRequestSchema.validate(req.body);
        break;
      case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
        validationResponse = bundlerEstimateUserOpGasRequestSchema.validate(req.body);
        break;
      case EthMethodType.GET_USER_OPERATION_BY_HASH:
        validationResponse = bundlerGetUserOpByHashRequestSchema.validate(req.body);
        break;
      case EthMethodType.GET_USER_OPERATION_RECEIPT:
        validationResponse = bundlerGetUserOpReceiptRequestSchema.validate(req.body);
        break;
      // case EthMethodType.SUPPORTED_ENTRY_POINTS:
      //   validationResponse = bundlerSupportedEntryPointsRequestSchema.validate(req.body);
      //   break;
      // case EthMethodType.CHAIN_ID:
      //   validationResponse = bundlerChainIdRequestSchema.validate(req.body);
      //   break;
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
