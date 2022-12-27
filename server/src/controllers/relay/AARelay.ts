import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { isError, TransactionStatus, TransactionType } from '../../../../common/types';
import { generateTransactionId } from '../../../../common/utils';
import { config } from '../../../../config';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];
    const metaData = req.body.params[3];
    const gasLimitFromSimulation = req.body.params[4];

    const transactionId = generateTransactionId(userOp);

    const response = routeTransactionToRelayerMap[chainId][TransactionType.AA]!
      .sendTransactionToRelayer({
        type: TransactionType.AA,
        to: entryPointAddress,
        data: '0x0',
        gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
        chainId,
        value: '0x0',
        userOp,
        transactionId,
        metaData,
      });

    transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.AA,
      status: TransactionStatus.PENDING,
      chainId,
      metaData,
      resubmitted: false,
      creationTime: Date.now(),
    });

    if (isError(response)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(StatusCodes.OK).json({
      code: StatusCodes.OK,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in AA relay ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(error) || 'Internal server error',
    });
  }
};
