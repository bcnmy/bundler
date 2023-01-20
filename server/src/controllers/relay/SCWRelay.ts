import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import {
  isError,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { generateTransactionId } from '../../../../common/utils';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relaySCWTransaction = async (req: Request, res: Response) => {
  try {
    const {
      to, data, gasLimit, chainId, value, walletInfo,
    } = req.body.params[0];
    log.info(`Relaying SCW Transaction for SCW: ${to} on chainId: ${chainId}`);

    const gasLimitFromSimulation = req.body.params[1] ? `0x${(req.body.params[1]).toString(16)}` : null;
    const transactionId = generateTransactionId(data);
    log.info(`Sending transaction to relayer with transactionId: ${transactionId} for SCW: ${to} on chainId: ${chainId}`);
    if (!routeTransactionToRelayerMap[chainId][TransactionType.AA]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionMethodType.SCW} method not supported for chainId: ${chainId}`,
      });
    }

    const response = await routeTransactionToRelayerMap[chainId][TransactionType.SCW]
      .sendTransactionToRelayer({
        type: TransactionType.SCW,
        to,
        data,
        gasLimit: gasLimit || gasLimitFromSimulation,
        chainId,
        value,
        walletAddress: walletInfo.address.toLowerCase(),
        transactionId,
      });

    transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.SCW,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress: walletInfo.address,
      resubmitted: false,
      creationTime: Date.now(),
    });

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      code: STATUSES.SUCCESS,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in SCW relay ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
