import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { transactionDao } from '../../../../common/service-manager';
import { parseError } from '../../../../common/utils';

const log = logger(module);

export const transactionStatusApi = async (req: Request, res: Response) => {
  const chainIdInStr = req.query.chainId as string;
  const chainId = parseInt(chainIdInStr, 10);
  const transactionId = req.query.transactionId as string;
  const response = await transactionDao.getByTransactionId(chainId, transactionId);
  log.info(`Transaction status for transactionId ${transactionId} on chainId ${chainId} is ${JSON.stringify(response)}`);
  try {
    if (!response) {
      log.info(`Transaction status for transactionId ${transactionId} on chainId ${chainId} is not found`);
      return res.status(StatusCodes.NOT_FOUND).json({
        code: StatusCodes.NOT_FOUND,
        error: 'Transaction not found',
      });
    }
    log.info(`Transaction status for transactionId ${transactionId} on chainId ${chainId} is ${JSON.stringify(response)}`);
    if (response.length) {
      return res.json({
        code: StatusCodes.OK,
        data: {
          chainId,
          transactionId: response[0].transactionId,
          status: response[0].status,
          transactionHash: response[0].transactionHash,
          gasPrice: response[0].gasPrice,
          receipt: response[0].receipt,
          previousTransactionHash: response.length > 1 ? response[0].previousTransactionHash : null,
        },
      });
    }
    return res.status(StatusCodes.NOT_FOUND).json({
      code: StatusCodes.NOT_FOUND,
      error: 'Transaction not found',
    });
  } catch (error) {
    log.error(`Error in transaction status ${parseError(error)}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: parseError(error),
    });
  }
};
