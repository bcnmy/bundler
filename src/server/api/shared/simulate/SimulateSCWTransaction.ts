/* eslint-disable import/no-import-module-exports */
import { Request } from "express";
import { getLogger } from "../../../../common/logger";
import { STATUSES } from "../middleware";
import { customJSONStringify } from "../../../../common/utils";

const log = getLogger(module);

export const simulateSCWTransaction = async (req: Request) => {
  try {
    const { to, chainId } = req.body.params[0];

    // Removed a lot of values as we have planned to clean the code 
    // Tenderly simulation was being used but only for a very old flow
    // Hence hardcoding some values to avoid errors
    // The SCW will be completely removed in the future
    // The logic for refundAmount was anyways storing incorrect values so defaulting to 0

    req.body.params[1] = 5000000;
    req.body.params[2] = {
      refundAmount: 0,
      refundAmountInUSD: 0,
    };
    log.info(
      `Transaction successfully simulated for SCW: ${to} on chainId: ${chainId}`,
    );
    return {
      code: STATUSES.SUCCESS,
      message: "Transaction successfully simulated",
    };
  } catch (error) {
    log.error(
      `Error in SCW transaction simulation ${customJSONStringify(error)}`,
    );
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in SCW transaction simulation ${customJSONStringify(
        error,
      )}`,
    };
  }
};
