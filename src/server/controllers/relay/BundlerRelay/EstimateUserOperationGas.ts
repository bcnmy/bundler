/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { toHex } from "viem";
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from "../../../middleware";
import { logger } from "../../../../common/logger";
import {
  bundlerSimulatonServiceMap,
  gasPriceServiceMap,
} from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";
import {
  RPCBadRequest,
  RPCInternalServerError,
  tryFindEntrypoint,
} from "./helpers";
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const estimateUserOperationGas = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];
  const { id } = req.body;

  try {
    const chainId = parseInt(req.params.chainId, 10);

    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const stateOverrideSet = req.body.params[2];

    const entryPointContract = tryFindEntrypoint(chainId, entryPointAddress);

    if (!entryPointContract) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(
          new RPCBadRequest(
            id,
            `Entry point with address=${entryPointAddress} not supported by Bundler`,
          ),
        );
    }

    const estimatedUserOpGas = await bundlerSimulatonServiceMap[
      chainId
    ].estimateUserOperationGas({
      userOp,
      entryPointContract,
      chainId,
      stateOverrideSet,
    });

    const { code, message, data } = estimatedUserOpGas;

    if (code !== STATUSES.SUCCESS) {
      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     error: {
      //       code: code || BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      //       message,
      //     },
      //   },
      //   httpResponseCode: STATUSES.BAD_REQUEST,
      // });

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

    const gasPrice = await gasPriceServiceMap[Number(chainId)]?.getGasPrice();

    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price for chainId: ${chainId} is: ${customJSONStringify(
          gasPrice,
        )}`,
      );

      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     result: {
      //       callGasLimit,
      //       verificationGasLimit,
      //       preVerificationGas,
      //       validUntil,
      //       validAfter,
      //       maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas,
      //       maxFeePerGas: gasPrice?.maxFeePerGas,
      //     },
      //   },
      //   httpResponseCode: STATUSES.SUCCESS,
      // });

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

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     result: {
    //       callGasLimit,
    //       verificationGasLimit,
    //       preVerificationGas,
    //       validUntil,
    //       validAfter,
    //       maxPriorityFeePerGas: gasPrice,
    //       maxFeePerGas: gasPrice,
    //     },
    //   },
    //   httpResponseCode: STATUSES.SUCCESS,
    // });

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        validUntil,
        validAfter,
        maxPriorityFeePerGas: gasPrice.toString(),
        maxFeePerGas: gasPrice.toString(),
      },
    });
  } catch (error) {
    log.error(`Error in estimateUserOperationGas handler ${parseError(error)}`);
    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
    return res
      .status(STATUSES.INTERNAL_SERVER_ERROR)
      .json(new RPCInternalServerError(id, error));
  }
};
