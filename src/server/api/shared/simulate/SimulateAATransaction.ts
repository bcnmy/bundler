/* eslint-disable import/no-import-module-exports */
import { Request } from "express";
import { getLogger } from "../../../../common/logger";
import {
  bundlerSimulationServiceMap,
  entryPointMap,
} from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";
import { BUNDLER_ERROR_CODES, STATUSES } from "../middleware";

const log = getLogger(module);

// eslint-disable-next-line consistent-return
export const simulateAATransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];

    const entryPointContracts = entryPointMap[chainId];

    let entryPointContract;
    for (
      let entryPointContractIndex = 0;
      entryPointContractIndex < entryPointContracts.length;
      entryPointContractIndex += 1
    ) {
      if (
        entryPointContracts[entryPointContractIndex].address.toLowerCase() ===
        entryPointAddress.toLowerCase()
      ) {
        entryPointContract =
          entryPointContracts[entryPointContractIndex].entryPointContract;
        break;
      }
    }
    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: "Entry point not found in relayer node",
      };
    }

    const aaSimulationResponse = await bundlerSimulationServiceMap[
      chainId
    ].simulateValidation({ userOp, entryPointContract, chainId });

    log.info(
      `AA simulation response: ${customJSONStringify(aaSimulationResponse)}`,
    );

    const { code, message } = aaSimulationResponse;

    if (code !== STATUSES.SUCCESS) {
      if (code === BUNDLER_ERROR_CODES.WALLET_TRANSACTION_REVERTED) {
        return {
          code,
          message,
        };
      }
      return {
        code,
        message,
      };
    }
    req.body.params[4] = aaSimulationResponse.data.totalGas;
    req.body.params[5] = aaSimulationResponse.data.userOpHash;

    log.info(
      `Transaction successfully simulated for userOp: ${customJSONStringify(
        userOp,
      )} on chainId: ${chainId}`,
    );
    return {
      code: STATUSES.SUCCESS,
      message: "AA transaction successfully simulated",
    };
  } catch (error) {
    log.error(`Error in AA transaction simulation ${parseError(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in AA transaction simulation ${parseError(error)}`,
    };
  }
};
