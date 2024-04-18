/* eslint-disable import/no-import-module-exports */
import { Request } from "express";
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from "../middleware";
import {
  entryPointMap,
  bundlerSimulationServiceMap,
} from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";
import { logger } from "../../../../common/logger";
import { config } from "../../../../config";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// eslint-disable-next-line consistent-return
export const validateBundlerTransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId, dappAPIKey } = req.params;
    const simulationTypeData = req.body.params[2];
    log.info(`chainId from request params: ${chainId}`);
    log.info(`dappAPIKey from request params: ${dappAPIKey}`);

    if (dappAPIKey === "nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44") {
      if (!config.testnetNetworks.includes(parseInt(chainId, 10))) {
        return {
          code: -32400,
          message:
            "Request to mainnet not allowed. Please reach out and request a mainnet Bundler URL",
        };
      }
    }

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
        ].simulateValidationAndExecution({
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
      if (code === BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED) {
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
