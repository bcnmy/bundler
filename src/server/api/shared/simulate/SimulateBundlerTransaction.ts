import { Request } from "express";
import { BUNDLER_ERROR_CODES } from "../errors/codes";
import {
  entryPointMap,
  entryPointMapV07,
  bundlerSimulationServiceMap,
  bundlerSimulationServiceMapV07,
} from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";
import { logger } from "../../../../common/logger";
import { STATUSES } from "../statuses";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const validateBundlerTransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId, dappAPIKey } = req.params;
    const simulationTypeData = req.body.params[2];
    log.info(`chainId from request params: ${chainId}`);
    log.info(`dappAPIKey from request params: ${dappAPIKey}`);

    const entryPointContracts = entryPointMap[parseInt(chainId, 10)];

    const entryPointContract = entryPointContracts.find(
      (entryPoint) =>
        entryPoint.address.toLowerCase() === entryPointAddress.toLowerCase(),
    )?.entryPointContract;

    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: "Entry point not supported by Bundler",
      };
    }

    let bundlerSimulationAndValidationResponse;
    if (
      !simulationTypeData ||
      Object.keys(simulationTypeData).length === 0 ||
      simulationTypeData.simulation_type === "validation"
    ) {
      const start = performance.now();
      bundlerSimulationAndValidationResponse =
        await bundlerSimulationServiceMap[
          parseInt(chainId, 10)
        ].simulateValidation({
          userOp,
          entryPointContract,
          chainId: parseInt(chainId, 10),
        });
      const end = performance.now();
      log.info(
        `simulateValidation of bundlerSimulationServiceMap took ${
          end - start
        } milliseconds`,
      );
    } else {
      const start = performance.now();
      bundlerSimulationAndValidationResponse =
        await bundlerSimulationServiceMap[
          parseInt(chainId, 10)
        ].simulateValidation({
          userOp,
          entryPointContract,
          chainId: parseInt(chainId, 10),
        });
      const end = performance.now();
      log.info(
        `simulateValidationAndExecution of bundlerSimulationServiceMap took ${
          end - start
        } milliseconds`,
      );
    }

    log.info(
      `Bundler simulation and validation response: ${JSON.stringify(
        bundlerSimulationAndValidationResponse,
      )}`,
    );

    const { code, message, data } = bundlerSimulationAndValidationResponse;

    if (code !== STATUSES.SUCCESS) {
      if (code === BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED) {
        return {
          code,
          message,
          handleOpsCallData: data.handleOpsCallData,
        };
      }
      return {
        code,
        message,
      };
    }
    req.body.params[2] = bundlerSimulationAndValidationResponse.data.totalGas;
    req.body.params[3] = bundlerSimulationAndValidationResponse.data.userOpHash;
    log.info(
      `Transaction successfully simulated and validated for userOp: ${JSON.stringify(
        userOp,
      )} on chainId: ${chainId}`,
    );
    return {
      code: STATUSES.SUCCESS,
      message: "User op successfully simulated and validated",
    };
  } catch (error) {
    log.error(
      `Error in Bundler user op simulation and validation ${parseError(error)}`,
    );
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in Bundler user op simulation and validation ${parseError(
        error,
      )}`,
    };
  }
};

export const validateBundlerV3Transaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId, apiKey } = req.params;
    const simulationTypeData = req.body.params[2];
    log.info(`chainId from request params: ${chainId}`);
    log.info(`apiKey from request params: ${apiKey}`);

    const entryPointContracts = entryPointMapV07[parseInt(chainId, 10)];

    const entryPointContract = entryPointContracts.find(
      (entryPoint) =>
        entryPoint.address.toLowerCase() === entryPointAddress.toLowerCase(),
    )?.entryPointContract;

    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: "Entry point not supported by Bundler",
      };
    }

    let bundlerSimulationAndValidationResponse;
    if (
      !simulationTypeData ||
      Object.keys(simulationTypeData).length === 0 ||
      simulationTypeData.simulation_type === "validation"
    ) {
      const start = performance.now();
      bundlerSimulationAndValidationResponse =
        await bundlerSimulationServiceMapV07[
          parseInt(chainId, 10)
        ].simulateValidation({
          userOp,
          entryPointContract,
          chainId: parseInt(chainId, 10),
        });
      const end = performance.now();
      log.info(
        `simulateValidation of bundlerSimulationServiceMap took ${
          end - start
        } milliseconds`,
      );
    } else {
      const start = performance.now();
      bundlerSimulationAndValidationResponse =
        await bundlerSimulationServiceMapV07[
          parseInt(chainId, 10)
        ].simulateValidation({
          userOp,
          entryPointContract,
          chainId: parseInt(chainId, 10),
        });
      const end = performance.now();
      log.info(
        `simulateValidationAndExecution of bundlerSimulationServiceMap took ${
          end - start
        } milliseconds`,
      );
    }

    log.info(
      `Bundler simulation and validation response: ${JSON.stringify(
        bundlerSimulationAndValidationResponse,
      )}`,
    );

    const { code, message, data } = bundlerSimulationAndValidationResponse;

    if (code !== STATUSES.SUCCESS) {
      if (code === BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED) {
        return {
          code,
          message,
          handleOpsCallData: data.handleOpsCallData,
        };
      }
      return {
        code,
        message,
      };
    }
    req.body.params[2] = bundlerSimulationAndValidationResponse.data.totalGas;
    req.body.params[3] = bundlerSimulationAndValidationResponse.data.userOpHash;
    log.info(
      `V3 Transaction successfully simulated and validated for userOp: ${JSON.stringify(
        userOp,
      )} on chainId: ${chainId}`,
    );
    return {
      code: STATUSES.SUCCESS,
      message: "User op successfully simulated and validated",
    };
  } catch (error) {
    log.error(
      `Error in Bundler user op simulation and validation ${parseError(error)}`,
    );
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in Bundler user op simulation and validation ${parseError(
        error,
      )}`,
    };
  }
};
