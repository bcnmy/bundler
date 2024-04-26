/* eslint-disable import/no-import-module-exports */
import { BUNDLER_ERROR_CODES } from "../../../server/api/shared/middleware";
import { getLogger } from "../../logger";
import RpcError from "../../utils/rpc-error";
import { ValidationData } from "../types";

const log = getLogger(module);

/**
 * Check if the user operation is valid for the network
 * @param validationData
 * @returns true if the user operation is valid
 */
export const checkUserOperationForRejection = async (
  validationData: ValidationData,
): Promise<boolean> => {
  const {
    userOp,
    networkMaxFeePerGas,
    networkMaxPriorityFeePerGas,
    networkPreVerificationGas,
    maxPriorityFeePerGasThresholdPercentage,
    maxFeePerGasThresholdPercentage,
    preVerificationGasThresholdPercentage,
  } = validationData;

  const { maxPriorityFeePerGas, maxFeePerGas, preVerificationGas } = userOp;

  log.info(
    `maxPriorityFeePerGasThresholdPercentage: ${maxPriorityFeePerGasThresholdPercentage}
       maxFeePerGasThresholdPercentage: ${maxFeePerGasThresholdPercentage} 
       preVerificationGasThresholdPercentage: ${preVerificationGasThresholdPercentage}`,
  );

  log.info(
    `networkMaxFeePerGas: ${networkMaxFeePerGas}
      networkMaxPriorityFeePerGas: ${networkMaxPriorityFeePerGas} 
      networkPreVerificationGas: ${networkPreVerificationGas}`,
  );

  const minimumAcceptableMaxPriorityFeePerGas =
    Number(networkMaxPriorityFeePerGas) *
    maxPriorityFeePerGasThresholdPercentage;
  const minimumAcceptableMaxFeePerGas =
    Number(networkMaxFeePerGas) * maxFeePerGasThresholdPercentage;
  const minimumAcceptablePreVerificationGas =
    Number(networkPreVerificationGas) * preVerificationGasThresholdPercentage;

  log.info(
    `minimumAcceptableMaxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas}
      minimumAcceptableMaxFeePerGas: ${minimumAcceptableMaxFeePerGas} 
      minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
  );

  log.info(
    `minimumAcceptableMaxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas} minimumAcceptableMaxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
  );
  log.info(`Checking if maxPriorityFeePerGas is within acceptable limits`);

  if (minimumAcceptableMaxPriorityFeePerGas > Number(maxPriorityFeePerGas)) {
    log.info(
      `maxPriorityFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas}`,
    );
    throw new RpcError(
      `maxPriorityFeePerGas in userOp: ${maxPriorityFeePerGas} is lower than expected maxPriorityFeePerGas: ${minimumAcceptableMaxPriorityFeePerGas}`,
      BUNDLER_ERROR_CODES.MAX_PRIORITY_FEE_PER_GAS_TOO_LOW,
    );
  }
  log.info(`maxPriorityFeePerGas is within acceptable limits`);
  log.info(`Checking if maxFeePerGas is within acceptable limits`);

  if (minimumAcceptableMaxFeePerGas > Number(maxFeePerGas)) {
    log.info(
      `maxFeePerGas in userOp: ${maxFeePerGas} is lower than expected maxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
    );
    throw new RpcError(
      `maxFeePerGas in userOp: ${maxFeePerGas} is lower than expected maxFeePerGas: ${minimumAcceptableMaxFeePerGas}`,
      BUNDLER_ERROR_CODES.MAX_FEE_PER_GAS_TOO_LOW,
    );
  }
  log.info(`maxFeePerGas is within acceptable limits`);
  log.info(`Checking if preVerificationGas is within acceptable limits`);

  if (minimumAcceptablePreVerificationGas > Number(preVerificationGas)) {
    log.info(
      `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
    );
    throw new RpcError(
      `preVerificationGas in userOp: ${preVerificationGas} is lower than minimumAcceptablePreVerificationGas: ${minimumAcceptablePreVerificationGas}`,
      BUNDLER_ERROR_CODES.PRE_VERIFICATION_GAS_TOO_LOW,
    );
  }

  log.info(
    `maxFeePerGas, maxPriorityFeePerGas and preVerification are within acceptable limits`,
  );
  return true;
};
