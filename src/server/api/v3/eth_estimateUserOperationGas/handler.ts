import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  bundlerSimulationServiceMapV07,
  entryPointMapV07,
  gasPriceServiceMap,
} from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";
import {
  EntryPointNotSupportedError,
  ChainIdNotSupportedError,
  GasPriceError,
} from "./errors";
import { EstimateUserOperationGasResponse } from "./response";
import { InternalServerError, RPCError } from "../shared/errors";
import { RPCErrorResponse } from "../shared/response";
import { STATUSES } from "../../shared/statuses";

const filenameLogger = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const estimateUserOperationGas = async (req: Request, res: Response) => {
  const { id } = req.body;
  const { chainId, apiKey } = req.params;

  // create a child logger so all important tracing info is logged with each call
  const log = filenameLogger.child({
    chainId,
    requestId: id,
    apiKey,
  });

  log.info(
    `EP v7 estimateUserOperationGas called, entryPointAddress: ${req.body.params[1]}`,
  );

  try {
    const [userOp, entryPointAddress, stateOverrideSet] = req.body.params;

    // Check if given entrypoint is supported by our bundler
    const entryPointContracts = entryPointMapV07[parseInt(chainId, 10)];
    const entryPointContract = entryPointContracts?.find(
      (e) => e.address.toLowerCase() === entryPointAddress.toLowerCase(),
    );

    if (!entryPointContract) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(
          new RPCErrorResponse(
            new EntryPointNotSupportedError(entryPointAddress),
            id,
          ),
        );
    }

    // Check if given chain id is supported by our bundler
    const simulator = bundlerSimulationServiceMapV07[parseInt(chainId, 10)];
    if (!simulator) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(new RPCErrorResponse(new ChainIdNotSupportedError(chainId), id));
    }

    // Estimate gas for the user operation using the simulator
    const estimatedUserOpGas = await simulator.estimateUserOperationGas({
      userOp,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entryPointContract: entryPointContract as any,
      chainId: parseInt(chainId, 10),
      stateOverrideSet,
    });

    const { code, message, data } = estimatedUserOpGas;
    if (code !== STATUSES.SUCCESS) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(new RPCErrorResponse(new RPCError(code, message), id));
    }

    const {
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      paymasterPostOpGasLimit,
      paymasterVerificationGasLimit,
    } = data;
    const gasPriceService = gasPriceServiceMap[parseInt(chainId, 10)];
    if (!gasPriceService) {
      return res
        .status(STATUSES.BAD_REQUEST)
        .json(new RPCErrorResponse(new GasPriceError(chainId), id));
    }

    const gasPrice = await gasPriceService.getGasPrice();

    let maxPriorityFeePerGas: string;
    let maxFeePerGas: string;
    if (typeof gasPrice !== "bigint") {
      log.info(
        `Gas price for chainId: ${chainId} is: ${customJSONStringify(
          gasPrice,
        )}`,
      );

      maxPriorityFeePerGas =
        gasPrice?.maxPriorityFeePerGas?.toString() as string;

      maxFeePerGas = gasPrice?.maxFeePerGas?.toString() as string;
    } else {
      maxPriorityFeePerGas = gasPrice?.toString() as string;
      maxFeePerGas = gasPrice?.toString() as string;
    }
    const response = new EstimateUserOperationGasResponse({
      callGasLimit: Number(callGasLimit),
      verificationGasLimit: Number(verificationGasLimit),
      preVerificationGas: Number(preVerificationGas),
      paymasterPostOpGasLimit: Number(paymasterPostOpGasLimit),
      paymasterVerificationGasLimit: Number(paymasterVerificationGasLimit),
      maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
      maxFeePerGas: Number(maxFeePerGas),
    });
    response.id = id;

    return res.status(STATUSES.SUCCESS).json(response);
  } catch (error) {
    log.error(`Error in estimateUserOperationGas handler ${parseError(error)}`);
    return res
      .status(STATUSES.INTERNAL_SERVER_ERROR)
      .json(new RPCErrorResponse(new InternalServerError(error), id));
  }
};
