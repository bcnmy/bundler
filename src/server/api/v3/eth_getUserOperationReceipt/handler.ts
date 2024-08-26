/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";
import { logger } from "../../../../common/logger";
import { userOperationV07Dao } from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * userOpHash the request hash
  entryPoint
  sender
  nonce
  paymaster the paymaster used for this userOp (or empty)
  actualGasCost - actual amount paid (by account or paymaster) for this UserOperation
  actualGasUsed - total gas used by this UserOperation (including preVerification, creation, validation and execution)
  success boolean - did this execution completed without revert
  reason in case of revert, this is the revert reason
  logs the logs generated by this UserOperation (not including logs of other UserOperations in the same bundle)
  receipt the TransactionReceipt object. Note that the returned TransactionReceipt is for the entire bundle, not only for this UserOperation.
 */
export const getUserOperationReceipt = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;
    const userOpHash = req.body.params[0];

    const userOperationData =
      await userOperationV07Dao.getUserOperationDataByUserOpHash(
        parseInt(chainId, 10),
        userOpHash,
      );
    if (!userOperationData || !userOperationData.receipt) {
      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     result: null,
      //   },
      //   httpResponseCode: STATUSES.SUCCESS,
      // });

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: id || 1,
        result: null,
      });
    }

    const {
      entryPoint,
      sender,
      nonce,
      success,
      paymaster,
      actualGasCost,
      actualGasUsed,
      logs,
      receipt,
      reason,
    } = userOperationData;

    const result = {
      userOpHash,
      entryPoint,
      sender,
      nonce,
      success,
      paymaster,
      actualGasCost,
      actualGasUsed,
      reason,
      logs,
      receipt,
    };

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: 1,
    //     result,
    //   },
    //   httpResponseCode: STATUSES.SUCCESS,
    // });
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: 1,
      result,
    });
  } catch (error) {
    log.error(`Error in getUserOperationReceipt handler: ${parseError(error)}`);
    const { id } = req.body;
    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
