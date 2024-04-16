/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { toHex } from "viem";
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from "../../../middleware";
import { logger } from "../../../../common/logger";
import {
  bundlerSimulatonServiceMap as bundlerSimulationServiceMap,
  entryPointMap,
  gasPriceServiceMap,
} from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const estimateUserOperationGas = async (req: Request, res: Response) => {
  // TODO: Create child logger with chainId, requestId, client key and entry point address
  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    const [userOp, entryPointAddress, stateOverrideSet] = req.body.params;

    const entryPointContracts = entryPointMap[parseInt(chainId, 10)];
    const entryPointContract = entryPointContracts?.find(
      (e) => e.address.toLowerCase() === entryPointAddress.toLowerCase(),
    );

    // TODO: Extract errors like these to custom errors classes
    if (!entryPointContract) {
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.BAD_REQUEST,
          message: `Entry point with entryPointAddress: ${entryPointAddress} not supported by Bundler.
          Please make sure that the given entryPointAddress is correct`,
        },
      });
    }

    const simulator = bundlerSimulationServiceMap[parseInt(chainId, 10)];
    if (!simulator) {
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.BAD_REQUEST,
          message: `Can't estimate user operations gas for chainId: ${chainId}.
          Please make sure that the chainId is correct and supported by our Bundler`,
        },
      });
    }

    const estimatedUserOpGas = await simulator.estimateUserOperationGas({
      userOp,
      entryPointContract: entryPointContract as any,
      chainId: parseInt(chainId, 10),
      stateOverrideSet,
    });

    const { code, message, data } = estimatedUserOpGas;

    if (code !== STATUSES.SUCCESS) {
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: code || BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
          message,
        },
      });
    }

    const {
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      validUntil,
      validAfter,
    } = data;

    const gasPriceService = gasPriceServiceMap[parseInt(chainId, 10)];
    if (!gasPriceService) {
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: {
          code: STATUSES.BAD_REQUEST,
          message: `Don't know how to fetch gas price for chainId: ${chainId}.
          Please make sure that the chainId is correct and supported by our Bundler`,
        },
      });
    }

    const gasPrice = await gasPriceService.getGasPrice();
    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price for chainId: ${chainId} is: ${customJSONStringify(
          gasPrice,
        )}`,
      );

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          callGasLimit: Number(callGasLimit),
          verificationGasLimit: Number(verificationGasLimit),
          preVerificationGas: Number(preVerificationGas),
          validUntil: toHex(validUntil),
          validAfter: toHex(validAfter),
          maxPriorityFeePerGas:
            gasPrice?.maxPriorityFeePerGas?.toString() as string,
          maxFeePerGas: gasPrice?.maxFeePerGas?.toString() as string,
        },
      });
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        callGasLimit: Number(callGasLimit),
        verificationGasLimit: Number(verificationGasLimit),
        preVerificationGas: Number(preVerificationGas),
        validUntil: toHex(validUntil),
        validAfter: toHex(validAfter),
        maxPriorityFeePerGas: gasPrice?.toString() as string,
        maxFeePerGas: gasPrice?.toString() as string,
      },
    });
  } catch (error) {
    log.error(`Error in estimateUserOperationGas handler ${parseError(error)}`);
    const { id } = req.body;

    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
