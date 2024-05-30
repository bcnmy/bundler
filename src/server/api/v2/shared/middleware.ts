/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-case-declarations */
import { NextFunction, Request, Response } from "express";
import config from "config";
import { logger } from "../../../../common/logger";
import {
  EthMethodType,
  BiconomyMethodType,
  TransactionMethodType,
} from "../../../../common/types";
import {
  bundlerChainIdRequestSchema,
  bundlerEstimateUserOpGasRequestSchema,
  bundlerGetUserOpByHashRequestSchema,
  bundlerGetUserOpReceiptRequestSchema,
  bundlerGetUserOpsByApiKeyRequestSchema,
  bundlerSendUserOpRequestSchema,
  bundlerSupportedEntryPointsRequestSchema,
  gasAndGasPricesRequestSchema,
  getGasFeeValuesRequestSchema,
  getUserOperationStatusSchema,
} from "../schema";
import {
  BUNDLER_ERROR_CODES,
  STATUSES,
} from "../../shared/middleware/RequestHelpers";
import { parseError } from "../../../../common/utils";
import { RPCErrorResponse } from "./response";
import { ChainIdNotSupportedError } from "./errors";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// validateChainId middleware checks if the chainId provided in the request is supported by this bundler
export const validateChainId =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supportedNetworks = config.get<Array<number>>("supportedNetworks");
      const chainId = parseInt(req.params.chainId, 10);

      if (chainId && !supportedNetworks.includes(chainId)) {
        return res
          .status(STATUSES.BAD_REQUEST)
          .json(
            new RPCErrorResponse(
              new ChainIdNotSupportedError(req.params.chainId),
              0,
            ),
          );
      }
    } catch (err: any) {
      log.error(`Error in validateChainId: ${parseError(err)}`);
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
        jsonrpc: "2.0",
        id: 0,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: parseError(err),
        },
      });
    }

    return next();
  };

export const validateBundlerRequest =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = performance.now();
      const { method, id } = req.body;
      let validationResponse;
      switch (method) {
        case TransactionMethodType.BUNDLER:
          validationResponse = bundlerSendUserOpRequestSchema.validate(
            req.body,
          );
          break;
        case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
          validationResponse = bundlerEstimateUserOpGasRequestSchema.validate(
            req.body,
          );
          break;
        case EthMethodType.GET_USER_OPERATION_BY_HASH:
          validationResponse = bundlerGetUserOpByHashRequestSchema.validate(
            req.body,
          );
          break;
        case EthMethodType.GET_USER_OPERATION_RECEIPT:
          validationResponse = bundlerGetUserOpReceiptRequestSchema.validate(
            req.body,
          );
          break;
        case EthMethodType.SUPPORTED_ENTRY_POINTS:
          validationResponse =
            bundlerSupportedEntryPointsRequestSchema.validate(req.body);
          break;
        case EthMethodType.CHAIN_ID:
          validationResponse = bundlerChainIdRequestSchema.validate(req.body);
          break;
        case EthMethodType.GAS_AND_GAS_PRICES:
          validationResponse = gasAndGasPricesRequestSchema.validate(req.body);
          break;
        case EthMethodType.GET_USER_OPERATIONS_BY_API_KEY:
          validationResponse = bundlerGetUserOpsByApiKeyRequestSchema.validate(
            req.body,
          );
          break;
        case BiconomyMethodType.GET_GAS_FEE_VALUES:
          validationResponse = getGasFeeValuesRequestSchema.validate(req.body);
          break;
        case BiconomyMethodType.GET_USER_OPERATION_STATUS:
          validationResponse = getUserOperationStatusSchema.validate(req.body);
          break;
        default:
          const end = performance.now();
          log.info(`validateBundlerRequest took ${end - start} milliseconds`);
          return res.status(STATUSES.BAD_REQUEST).send({
            jsonrpc: "2.0",
            id: id || 1,
            error: {
              code: BUNDLER_ERROR_CODES.METHOD_NOT_FOUND,
              message:
                "Wrong transaction type sent in validate BUNDLER request",
            },
          });
      }
      const { error } = validationResponse;
      const valid = error === undefined;
      if (valid) {
        const end = performance.now();
        log.info(`validateBundlerRequest took ${end - start} milliseconds`);
        return next();
      }
      log.info(
        `error from validation: ${parseError(error)} for method: ${method}`,
      );
      const { details } = error;
      let message;
      if (details) {
        message = details
          .map((i) => (i.context ? i.context.message : i.message))
          .join(",");
      } else {
        message = error.message || error.toString();
      }
      const end = performance.now();
      log.info(`validateBundlerRequest took ${end - start} milliseconds`);
      return res.send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: BUNDLER_ERROR_CODES.INVALID_USER_OP_FIELDS,
          message,
        },
      });
    } catch (e: any) {
      const { id } = req.body;
      log.error(e);
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: parseError(e),
        },
      });
    }
  };
