/* eslint-disable no-case-declarations */
import { NextFunction, Request, Response } from "express";
import config from "config";
import { logger } from "../../../../common/logger";
import {
  bundlerChainIdRequestSchema,
  bundlerEstimateUserOpGasRequestSchema,
  bundlerGetUserOpByHashRequestSchema,
  bundlerGetUserOpReceiptRequestSchema,
  bundlerSendUserOpRequestSchema,
  bundlerSupportedEntryPointsRequestSchema,
  getGasFeeValuesRequestSchema,
  getUserOperationStatusSchema,
} from "../schema";
import { parseError } from "../../../../common/utils";
import { RPCErrorResponse } from "./response";
import { ChainIdNotSupportedError } from "./errors";
import { STATUSES } from "../../shared/statuses";
import { BundlerMethods } from "../../methods/bundler";
import { EthMethods } from "../../methods/eth";
import { BiconomyMethods } from "../../methods/biconomy";
import { BUNDLER_ERROR_CODES } from "../../shared/errors/codes";

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
    } catch (err: unknown) {
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
      log.info(`Received method: ${method}`);
      switch (method) {
        case BundlerMethods.eth_sendUserOperation:
          validationResponse = bundlerSendUserOpRequestSchema.validate(
            req.body,
          );
          break;
        case BundlerMethods.eth_estimateUserOperationGas:
          validationResponse = bundlerEstimateUserOpGasRequestSchema.validate(
            req.body,
          );
          break;
        case BundlerMethods.eth_getUserOperationByHash:
          validationResponse = bundlerGetUserOpByHashRequestSchema.validate(
            req.body,
          );
          break;
        case BundlerMethods.eth_getUserOperationReceipt:
          validationResponse = bundlerGetUserOpReceiptRequestSchema.validate(
            req.body,
          );
          break;
        case BundlerMethods.eth_supportedEntryPoints:
          validationResponse =
            bundlerSupportedEntryPointsRequestSchema.validate(req.body);
          break;
        case EthMethods.eth_chainId:
          validationResponse = bundlerChainIdRequestSchema.validate(req.body);
          break;
        case BiconomyMethods.biconomy_getGasFeeValues:
          validationResponse = getGasFeeValuesRequestSchema.validate(req.body);
          break;
        case BiconomyMethods.biconomy_getUserOperationStatus:
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
    } catch (e: unknown) {
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
