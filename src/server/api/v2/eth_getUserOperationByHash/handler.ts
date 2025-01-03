import { Request, Response } from "express";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";
import { logger } from "../../../../common/logger";
import { userOperationDao } from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * null in case the UserOperation is not yet included in a block,
 * or a full UserOperation, with
 * the addition of entryPoint, blockNumber, blockHash and transactionHash
 */
export const getUserOperationByHash = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    const userOpHash = req.body.params[0];

    const userOperation =
      await userOperationDao.getUserOperationDataByUserOpHash(
        parseInt(chainId, 10),
        userOpHash,
      );

    if (!userOperation || !userOperation.transactionHash) {
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
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      preVerificationGas,
      verificationGasLimit,
      paymasterAndData,
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature,
      transactionHash,
      blockNumber,
      blockHash,
      entryPoint,
    } = userOperation;

    const result = {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      preVerificationGas,
      verificationGasLimit,
      paymasterAndData,
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature,
      entryPoint,
      transactionHash,
      blockNumber,
      blockHash,
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
    log.error(`Error in getUserOperationByHash handler ${parseError(error)}`);
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
