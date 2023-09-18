/* eslint-disable no-case-declarations */
import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import {
  bundlerChainIdRequestSchema,
  bundlerEstimateUserOpGasRequestSchema,
  bundlerGetUserOpByHashRequestSchema,
  bundlerGetUserOpReceiptRequestSchema,
  bundlerGetUserOpsByApiKeyRequestSchema,
  bundlerSendUserOpRequestSchema,
  bundlerSupportedEntryPointsRequestSchema,
  gasAndGasPricesRequestSchema,
} from '../../routes/bundler/bundler.schema';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../RequestHelpers';

const log = logger(module);

export const validateBundlerRequest = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const start = performance.now();
    const { method, id } = req.body;
    let validationResponse;
    switch (method) {
      case TransactionMethodType.BUNDLER:
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
      case EthMethodType.SUPPORTED_ENTRY_POINTS:
        validationResponse = bundlerSupportedEntryPointsRequestSchema.validate(req.body);
        break;
      case EthMethodType.CHAIN_ID:
        validationResponse = bundlerChainIdRequestSchema.validate(req.body);
        break;
      case EthMethodType.GAS_AND_GAS_PRICES:
        validationResponse = gasAndGasPricesRequestSchema.validate(req.body);
        break;
      case EthMethodType.GET_USER_OPERATIONS_BY_API_KEY:
        validationResponse = bundlerGetUserOpsByApiKeyRequestSchema.validate(req.body);
        break;
      default:
        const end = performance.now();
        log.info(`validateBundlerRequest took ${end - start} milliseconds`);
        return res.status(STATUSES.BAD_REQUEST).send({
          jsonrpc: '2.0',
          id: id || 1,
          error: {
            code: STATUSES.BAD_REQUEST,
            message: 'Wrong transaction type sent in validate BUNDLER request',
          },
        });
    }
    const { error } = validationResponse;
    log.info(`error from validation: ${JSON.stringify(error)} for method: ${method}`);
    const valid = error === undefined;
    if (valid) {
      const end = performance.now();
      log.info(`validateBundlerRequest took ${end - start} milliseconds`);
      return next();
    }
    const { details } = error;
    let message;
    if (details) {
      message = details.map((i) => (i.context ? i.context.message : i.message)).join(',');
    } else {
      message = error.message || error.toString();
    }
    const end = performance.now();
    log.info(`validateBundlerRequest took ${end - start} milliseconds`);
    return res.send({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INVALID_USER_OP_FIELDS,
        message,
      },
    });
  } catch (e: any) {
    const { id } = req.body;
    log.error(e);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        message: JSON.stringify(e),
      },
    });
  }
};
