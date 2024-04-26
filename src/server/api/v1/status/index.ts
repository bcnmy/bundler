/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { getLogger } from "../../../../common/logger";
import { transactionDao } from "../../../../common/service-manager";
import { customJSONStringify, parseError } from "../../../../common/utils";
import { STATUSES } from "../../shared/middleware";

const log = getLogger(module);

export const transactionStatusApi = async (req: Request, res: Response) => {
  const chainIdInStr = req.query.chainId as string;
  const chainId = parseInt(chainIdInStr, 10);
  const transactionId = req.query.transactionId as string;
  const response = await transactionDao.getByTransactionId(
    chainId,
    transactionId,
  );
  log.info(
    `Transaction status for transactionId ${transactionId} on chainId ${chainId} is ${customJSONStringify(
      response,
    )}`,
  );
  try {
    if (!response) {
      log.info(
        `Transaction status for transactionId ${transactionId} on chainId ${chainId} is not found`,
      );
      return res.status(STATUSES.NOT_FOUND).json({
        code: STATUSES.NOT_FOUND,
        error: "Transaction not found",
      });
    }
    log.info(
      `Transaction status for transactionId ${transactionId} on chainId ${chainId} is ${customJSONStringify(
        response,
      )}`,
    );
    if (response.length) {
      return res.json({
        code: STATUSES.SUCCESS,
        data: {
          chainId,
          transactionId: response[0].transactionId,
          status: response[0].status,
          transactionHash: response[0].transactionHash,
          gasPrice: response[0].gasPrice,
          receipt: response[0].receipt,
          previousTransactionHash:
            response.length > 1 ? response[0].previousTransactionHash : null,
        },
      });
    }
    return res.status(STATUSES.NOT_FOUND).json({
      code: STATUSES.NOT_FOUND,
      error: "Transaction not found",
    });
  } catch (error) {
    log.error(`Error in transaction status ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: parseError(error),
    });
  }
};
