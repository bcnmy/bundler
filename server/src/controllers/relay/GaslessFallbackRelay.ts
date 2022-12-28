import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { isError, TransactionStatus, TransactionType } from '../../../../common/types';
import { generateTransactionId } from '../../../../common/utils';
import { config } from '../../../../config';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayGaslessFallbackTransaction = async (req: Request, res: Response) => {
  try {
    const {
      type, to, data, gasLimit, chainId, value, walletInfo,
    } = req.body.params[0];
    log.info(`Relaying Gasless Fallback Transaction for Gasless Fallback: ${to} on chainId: ${chainId}`);

    const transactionId = generateTransactionId(data);
    log.info(`Sending transaction to relayer with transactionId: ${transactionId} for Gasless Fallback: ${to} on chainId: ${chainId}`);
    const response = await routeTransactionToRelayerMap[chainId][TransactionType.GASLESS_FALLBACK]!
      .sendTransactionToRelayer({
        type,
        to,
        data,
        gasLimit,
        chainId,
        value,
        walletAddress: walletInfo.address.toLowerCase(),
        transactionId,
      });

    transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.GASLESS_FALLBACK,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress: walletInfo.address,
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
    log.error(`Error in Gasless Fallback relay ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(error),
    });
  }
};
