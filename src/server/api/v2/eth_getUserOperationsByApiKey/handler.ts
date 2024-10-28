import { Request, Response } from "express";
import { STATUSES } from "../../shared/middleware";
import { logger } from "../../../../common/logger";
import { userOperationDao } from "../../../../common/service-manager";
import { parseError } from "../../../../common/utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const getStartTimeAndEndTimeInMs = (
  startTime: string | null,
  endTime: string | null,
) => {
  let startTimeInMs: number;
  let endTimeInMs: number;

  if (startTime === null && endTime === null) {
    log.info("startTime & endTime both are null");
    startTimeInMs = 0;
    endTimeInMs = Date.now();
    return {
      startTimeInMs,
      endTimeInMs,
    };
  }

  if (startTime !== null && endTime === null) {
    log.info(`startTime: ${startTime}`);
    log.info("endTime is null");
    if (!Number.isNaN(Date.parse(startTime))) {
      startTimeInMs = Date.parse(startTime);
    } else {
      startTimeInMs = 0;
    }
    endTimeInMs = Date.now();
    return {
      startTimeInMs,
      endTimeInMs,
    };
  }

  if (startTime === null && endTime !== null) {
    log.info(`endTime: ${endTime}`);
    log.info("startTime is null");
    if (!Number.isNaN(Date.parse(endTime))) {
      endTimeInMs = Date.parse(endTime);
    } else {
      endTimeInMs = Date.now();
    }
    startTimeInMs = 0;
    return {
      startTimeInMs,
      endTimeInMs,
    };
  }

  if (startTime !== null && endTime !== null) {
    log.info(`startTime: ${startTime}`);
    log.info(`endTime: ${endTime}`);
    if (!Number.isNaN(Date.parse(endTime))) {
      endTimeInMs = Date.parse(endTime);
    } else {
      endTimeInMs = Date.now();
    }
    if (!Number.isNaN(Date.parse(startTime))) {
      startTimeInMs = Date.parse(startTime);
    } else {
      startTimeInMs = 0;
    }
    return {
      startTimeInMs,
      endTimeInMs,
    };
  }

  return {
    startTimeInMs: 0,
    endTimeInMs: Date.now(),
  };
};

/**
 * it should give a lit of all userOps by the bundlerApiKey
 * data should be a combination of userOp data + receipt
 */
export const getUserOperationsByApiKey = async (
  req: Request,
  res: Response,
) => {
  try {
    const { chainId, bundlerApiKey } = req.params;
    const startTime = req.body.params[0];
    const endTime = req.body.params[1];
    let limit = req.body.params[2];
    let offSet = req.body.params[3];

    const { startTimeInMs, endTimeInMs } = getStartTimeAndEndTimeInMs(
      startTime,
      endTime,
    );
    log.info(
      `startTimeInMs: ${startTimeInMs}, endTimeInMs: ${endTimeInMs} for bundlerApiKey: ${bundlerApiKey} on chainId: ${chainId}`,
    );

    if (typeof limit !== "number" || ![10, 25, 100].includes(limit)) {
      limit = 10;
    }

    if (typeof offSet !== "number") {
      offSet = 0;
    }

    log.info(
      `getUserOperationsByApiKey request received for bundlerApiKey: ${bundlerApiKey} on chainId: ${chainId}`,
    );

    const userOperationsData =
      await userOperationDao.getUserOperationsDataByApiKey(
        parseInt(chainId, 10),
        bundlerApiKey,
        startTimeInMs,
        endTimeInMs,
        limit,
        offSet,
      );

    if (!userOperationsData) {
      log.info(
        `User operations data could not for apiKey: ${bundlerApiKey} on chainId: ${chainId}`,
      );
      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: 1,
        result: `User operations data could not for apiKey: ${bundlerApiKey} on chainId: ${chainId}`,
      });
    }

    const totalUserOperationsCount =
      await userOperationDao.getUserOperationsCountByApiKey(
        parseInt(chainId, 10),
        bundlerApiKey,
        0,
        Date.now(),
      );

    log.info(
      `totalUserOperationsCount: ${totalUserOperationsCount} for apiKey: ${bundlerApiKey} on chainId: ${chainId}`,
    );

    const userOpsData = [];

    for (let index = 0; index < userOperationsData.length; index += 1) {
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
        success,
        paymaster,
        actualGasCost,
        actualGasUsed,
        logs,
        receipt,
        reason,
      } = userOperationsData[index];

      userOpsData.push({
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
        success,
        paymaster,
        actualGasCost,
        actualGasUsed,
        logs,
        receipt,
        reason,
      });
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: 1,
      result: {
        totalNumOfUserOps: totalUserOperationsCount,
        numOfUserOps: userOpsData.length,
        limit,
        offSet,
        userOpsData,
      },
    });
  } catch (error) {
    log.error(
      `Error in getUserOperationsByApiKey handler ${parseError(error)}`,
    );
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
