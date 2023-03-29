import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao } from '../../../../common/service-manager';
import { generateTransactionId } from '../../../../common/utils';
import {
  isError,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const websocketUrl = config.socketService.wssUrl;

const log = logger(module);

export const relayFallbackGasTankDepositTransaction = async (req: Request, res: Response) => {
  try {
    const {
      gasLimit, chainId, value,
    } = req.body.params[0];

    const gasLimitFromSimulation = req.body.params[1] ? `0x${(req.body.params[1]).toString(16)}` : '0xF4240';

    const transactionId = generateTransactionId(Date.now().toString());
    const {
      address,
    } = config.fallbackGasTankData[chainId];
    log.info(`Sending transaction to relayer with transactionId: ${transactionId} for Gasless Fallback: ${address} on chainId: ${chainId}`);

    await transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.FALLBACK_GASTANK_DEPOSIT,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress: '',
      resubmitted: false,
      creationTime: Date.now(),
    });
    if (!routeTransactionToRelayerMap[chainId][TransactionType.FALLBACK_GASTANK_DEPOSIT]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionMethodType.FALLBACK_GASTANK_DEPOSIT} method not supported for chainId: ${chainId}`,
      });
    }

    // eslint-disable-next-line max-len
    const response = await routeTransactionToRelayerMap[chainId][TransactionType.FALLBACK_GASTANK_DEPOSIT]!
      .sendTransactionToRelayer({
        type: TransactionType.FALLBACK_GASTANK_DEPOSIT,
        to: address,
        data: '0x',
        gasLimit: gasLimit || gasLimitFromSimulation,
        chainId,
        value,
        walletAddress: '',
        transactionId,
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
    log.error(`Error in Gasless Fallback relay ${error}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(error),
    });
  }
};
