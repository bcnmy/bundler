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
      return res.status(400).json({
        code: 400,
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
      return res.status(400).json({
        code: 400,
        error: response.error,
      });
    }
    return res.status(200).json({
      code: 200,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in SCW relay ${JSON.stringify(error)}`);
    return res.status(500).json({
      code: 500,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
