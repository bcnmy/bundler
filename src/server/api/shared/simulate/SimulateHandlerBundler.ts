/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import { NextFunction, Request, Response } from "express";
import {
  validateBundlerTransaction,
  validateBundlerV3Transaction,
} from "./SimulateBundlerTransaction";
import { parseError } from "../../../../common/utils";
import { logger } from "../../../../common/logger";
import { STATUSES } from "../statuses";
import { BundlerMethods } from "../../methods/bundler";
import { EthMethods } from "../../methods/eth";
import { BiconomyMethods } from "../../methods/biconomy";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const simulateBundlerTransaction =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = performance.now();
      const { method, id } = req.body;
      let response = null;
      switch (method) {
        case BundlerMethods.eth_sendUserOperation:
          response = await validateBundlerTransaction(req);
          break;
        case BundlerMethods.eth_estimateUserOperationGas:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_getUserOperationByHash:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_getUserOperationReceipt:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_supportedEntryPoints:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case EthMethods.eth_chainId:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BiconomyMethods.biconomy_getGasFeeValues:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BiconomyMethods.biconomy_getUserOperationStatus:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        default:
          const end = performance.now();
          log.info(
            `simulateBundlerTransaction took ${end - start} milliseconds`,
          );
          response = {
            jsonrpc: "2.0",
            id: id || 1,
            error: {
              code: STATUSES.BAD_REQUEST,
              message: `Method: ${method} not supported by Bundler`,
            },
          };
      }

      if (!response) {
        const end = performance.now();
        log.info(`simulateBundlerTransaction took ${end - start} milliseconds`);
        return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
          jsonrpc: "2.0",
          id: id || 1,
          error: {
            code: STATUSES.INTERNAL_SERVER_ERROR,
            message: "Internal Server Error",
          },
        });
      }
      if ((response as any).code !== STATUSES.SUCCESS) {
        if ((response as any).handleOpsCallData !== null) {
          const end = performance.now();
          log.info(
            `simulateBundlerTransaction took ${end - start} milliseconds`,
          );
          return res.status(STATUSES.BAD_REQUEST).send({
            jsonrpc: "2.0",
            id: id || 1,
            error: {
              code: (response as any).code,
              message: (response as any).message,
              handleOpsCallData: (response as any).handleOpsCallData,
            },
          });
        }
        const end = performance.now();
        log.info(`simulateBundlerTransaction took ${end - start} milliseconds`);
        return res.status(STATUSES.BAD_REQUEST).send({
          jsonrpc: "2.0",
          id: id || 1,
          error: {
            code: (response as any).code,
            message: (response as any).message,
          },
        });
      }
      const end = performance.now();
      log.info(`simulateBundlerTransaction took ${end - start} milliseconds`);
      return next();
    } catch (error) {
      const { id } = req.body;
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: `Internal Server Error: ${parseError(error)}`,
        },
      });
    }
  };

export const simulateBundlerV3Transaction =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = performance.now();
      const { method, id } = req.body;
      let response = null;
      switch (method) {
        case BundlerMethods.eth_sendUserOperation:
          response = await validateBundlerV3Transaction(req);
          break;
        case BundlerMethods.eth_estimateUserOperationGas:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_getUserOperationByHash:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_getUserOperationReceipt:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BundlerMethods.eth_supportedEntryPoints:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case EthMethods.eth_chainId:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BiconomyMethods.biconomy_getGasFeeValues:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        case BiconomyMethods.biconomy_getUserOperationStatus:
          response = {
            code: STATUSES.SUCCESS,
            message: `Method: ${method} does not require simulation`,
          };
          break;
        default:
          const end = performance.now();
          log.info(
            `simulateBundlerTransaction took ${end - start} milliseconds`,
          );
          response = {
            jsonrpc: "2.0",
            id: id || 1,
            error: {
              code: STATUSES.BAD_REQUEST,
              message: `Method: ${method} not supported by Bundler`,
            },
          };
      }

      if (!response) {
        const end = performance.now();
        log.info(
          `simulateBundlerV3Transaction took ${end - start} milliseconds`,
        );
        return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
          jsonrpc: "2.0",
          id: id || 1,
          error: {
            code: STATUSES.INTERNAL_SERVER_ERROR,
            message: "Internal Server Error",
          },
        });
      }
      if ((response as any).code !== STATUSES.SUCCESS) {
        if ((response as any).handleOpsCallData !== null) {
          const end = performance.now();
          log.info(
            `simulateBundlerV3Transaction took ${end - start} milliseconds`,
          );
          return res.status(STATUSES.BAD_REQUEST).send({
            jsonrpc: "2.0",
            id: id || 1,
            error: {
              code: (response as any).code,
              message: (response as any).message,
              handleOpsCallData: (response as any).handleOpsCallData,
            },
          });
        }
        const end = performance.now();
        log.info(
          `simulateBundlerV3Transaction took ${end - start} milliseconds`,
        );
        return res.status(STATUSES.BAD_REQUEST).send({
          jsonrpc: "2.0",
          id: id || 1,
          error: {
            code: (response as any).code,
            message: (response as any).message,
          },
        });
      }
      const end = performance.now();
      log.info(`simulateBundlerV3Transaction took ${end - start} milliseconds`);
      return next();
    } catch (error) {
      const { id } = req.body;
      return res.status(STATUSES.INTERNAL_SERVER_ERROR).send({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.INTERNAL_SERVER_ERROR,
          message: `Internal Server Error: ${parseError(error)}`,
        },
      });
    }
  };
