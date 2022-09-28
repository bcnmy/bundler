import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { relayMap } from '../../../../common/service-manager';
import { isError, TransactionType } from '../../../../common/types';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = process.env.WEB_SOCKET_URL || '';
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relaySCWTransaction = async (req: Request, res: Response) => {
  try {
    log.info('relaySCWTransaction', req.body);
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body;
    const transactionId = generateTransactionId(data);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }
    log.info(`Sending transaction to relayer with ${transactionId}`);
    const response = await relayMap[chainId][TransactionType.SCW].sendTransactionToRelayer({
      type, to, data, gasLimit, chainId, value, transactionId,
    });
    if (isError(response)) {
      return res.status(400).json({
        msg: 'bad request',
        error: response.error,
      });
    }
    return res.json({
      transactionId,
      connectionUrl: websocketUrl,
    });
  } catch (error) {
    log.error(`Error in SCW relay ${error}`);
    return res.status(500).json({
      error: JSON.stringify(error),
    });
  }
};
