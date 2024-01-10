/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from "../../../middleware";
import { logger } from "../../../../common/logger";
import { customJSONStringify, parseError } from "../../../../common/utils";
import {
  userOperationDao,
  userOperationStateDao,
} from "../../../../common/service-manager";
import { UserOperationStateEnum } from "../../../../common/types";
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const getUserOperationStateData = async (
  chainId: number,
  userOpHash: string,
): Promise<{
  error: boolean;
  result: any;
}> => {
  log.info(
    `Getting userOp state for userOpHash: ${userOpHash} on chainId: ${chainId}`,
  );
  const userOperationStateData = await userOperationStateDao.get(
    chainId,
    userOpHash,
  );
  log.info(
    `userOperationStateData: ${customJSONStringify(
      userOperationStateData,
    )} for userOpHash: ${userOpHash} on chainId: ${chainId}`,
  );

  if (userOperationStateData == null) {
    log.info(`userOpHash: ${userOpHash} not found for chainId: ${chainId}`);
    return {
      error: true,
      result: {
        code: BUNDLER_VALIDATION_STATUSES.USER_OP_HASH_NOT_FOUND,
        message: `UserOpHash: ${userOpHash} not found for chainId: ${chainId}`,
      },
    };
  }

  if (
    userOperationStateData.state ===
    UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL
  ) {
    log.info(
      `userOp dropped from mempool with userOpHash: ${userOpHash} on chainId: ${chainId}`,
    );
    return {
      error: false,
      result: {
        state: UserOperationStateEnum.DROPPED_FROM_BUNDLER_MEMPOOL,
      },
    };
  }

  if (userOperationStateData.state === UserOperationStateEnum.BUNDLER_MEMPOOL) {
    log.info(
      `userOp with userOpHash: ${userOpHash} is in ${UserOperationStateEnum.BUNDLER_MEMPOOL} state on chainId: ${chainId}`,
    );
    return {
      error: false,
      result: {
        state: UserOperationStateEnum.BUNDLER_MEMPOOL,
      },
    };
  }

  if (userOperationStateData.state === UserOperationStateEnum.SUBMITTED) {
    log.info(
      `userOp with userOpHash: ${userOpHash} is in ${UserOperationStateEnum.SUBMITTED} state on chainId: ${chainId}`,
    );
    return {
      error: false,
      result: {
        state: UserOperationStateEnum.SUBMITTED,
        transactionHash: userOperationStateData.transactionHash,
      },
    };
  }

  if (userOperationStateData.state === UserOperationStateEnum.FAILED) {
    log.info(
      `userOp with userOpHash: ${userOpHash} is in ${UserOperationStateEnum.FAILED} state on chainId: ${chainId}`,
    );
    return {
      error: false,
      result: {
        state: UserOperationStateEnum.FAILED,
        message: userOperationStateData.message,
        transactionHash: userOperationStateData.transactionHash,
      },
    };
  }

  if (userOperationStateData.state === UserOperationStateEnum.CONFIRMED) {
    log.info(
      `userOp with userOpHash: ${userOpHash} is in ${UserOperationStateEnum.CONFIRMED} state on chainId: ${chainId}`,
    );
    log.info(
      `Fetching userOpReceipt for userOpHash: ${userOpHash} on chainId: ${chainId}`,
    );
    const userOperationData =
      await userOperationDao.getUserOperationDataByUserOpHash(
        chainId,
        userOpHash,
      );
    log.info(
      `userOperationData: ${customJSONStringify(
        userOperationData,
      )} for userOpHash: ${userOpHash} on chainId: ${chainId}`,
    );

    if (userOperationData === null) {
      log.info(`userOpHash: ${userOpHash} not found for chainId: ${chainId}`);
      return {
        error: true,
        result: {
          code: BUNDLER_VALIDATION_STATUSES.USER_OP_HASH_NOT_FOUND,
          message: `UserOpHash: ${userOpHash} not found for chainId: ${chainId}`,
        },
      };
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

    log.info(
      `userOp with userOpHash: ${userOpHash} is in ${UserOperationStateEnum.CONFIRMED} state on chainId: ${chainId}`,
    );
    return {
      error: false,
      result: {
        state: UserOperationStateEnum.CONFIRMED,
        message: userOperationStateData.message,
        transactionHash: userOperationStateData.transactionHash,
        userOperationReceipt: result,
      },
    };
  }

  log.info(
    `No state matched for userOpHash: ${userOpHash} on chainId: ${chainId}`,
  );
  return {
    error: true,
    result: {
      code: BUNDLER_VALIDATION_STATUSES.UNABLE_TO_PROCESS_USER_OP,
      message: `Unable to process userOp with UserOpHash: ${userOpHash} on chainId: ${chainId}`,
    },
  };
};

export const getUserOperationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;
    const userOpHash = req.body.params[0];

    const userOperationStateData = await getUserOperationStateData(
      parseInt(chainId, 10),
      userOpHash,
    );

    if (userOperationStateData.error) {
      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: id || 1,
        error: userOperationStateData.result,
      });
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: 1,
      result: userOperationStateData.result,
    });
  } catch (error) {
    log.error(`Error in getUserOperationStatus handler: ${parseError(error)}`);
    const { id } = req.body;
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
