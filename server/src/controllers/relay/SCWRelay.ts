import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap } from '../../../../common/service-manager';
import { isError, TransactionType } from '../../../../common/types';
import { config } from '../../../../config';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = config.socketService.wssUrl;
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relaySCWTransaction = async (req: Request, res: Response) => {
  try {
    log.info('relaySCWTransaction', req.body);
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body.params[0];
    const gasLimitFromSimulation = req.body.params[1] ? `0x${(req.body.params[1]).toString(16)}` : null;
    const transactionId = generateTransactionId(data);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }
    log.info(`Sending transaction to relayer with transactionId: ${transactionId}`);
    const response = await routeTransactionToRelayerMap[chainId][TransactionType.SCW]
      .sendTransactionToRelayer({
        type,
        to,
        data,
        gasLimit: gasLimit || gasLimitFromSimulation,
        chainId,
        value,
        transactionId,
      });
    if (isError(response)) {
      return res.status(400).json({
        msg: 'bad request',
        error: response.error,
      });
    }
    return {
      transactionId,
      connectionUrl: websocketUrl,
    };
  } catch (error) {
    log.error(`Error in SCW relay ${error}`);
    return res.status(500).json({
      error: JSON.stringify(error),
    });
  }
};
