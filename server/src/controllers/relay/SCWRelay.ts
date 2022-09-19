import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { isError } from '../../../../common/types';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = process.env.WEB_SOCKET_URL || '';
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relaySCWTransaction = async (req: Request, res: Response) => {
  try {
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body;
    const transactionId = generateTransactionId(data);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }
    const relayService = new AARelayService(transactionId);
    const response = await relayService.sendTransactionToRelayer({
      type, to, data, gasLimit, chainId, value,
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
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
