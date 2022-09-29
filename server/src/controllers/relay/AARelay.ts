import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { routeTransactionToRelayerMap } from '../../../../common/service-manager';
import { isError, TransactionType } from '../../../../common/types';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = process.env.WEB_SOCKET_URL || '';
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body;
    const transactionId = generateTransactionId(data);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }
    const response = await routeTransactionToRelayerMap[chainId][TransactionType.AA].sendTransactionToRelayer({
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
    log.error(`Error in AA relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
