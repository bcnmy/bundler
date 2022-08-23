import { Request, Response } from 'express';
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logger } from '../../../../common/log-config';
import { sendToQueue } from '../../service-manager/queue';
import { generateTransactionId } from '../../utils/tx-id-generator';

const websocketUrl = process.env.WEB_SOCKET_URL || '';
const clientMessenger = new ClientMessenger(
  websocketUrl,
);

const log = logger(module);

export const relayApi = async (req: Request, res: Response) => {
  try {
    const {
      type, to, data, gasLimit, chainId, value,
    } = req.body;
    const transactionId = generateTransactionId(data);
    if (!clientMessenger.socketClient.isConnected()) {
      await clientMessenger.connect();
    }
    const queueData = {
      transactionId, type, to, data, gasLimit, chainId, value,
    };
    const response = await sendToQueue(queueData);
    if (response.error) {
      return res.status(400).json({
        msg: 'bad request',
        error: response.error,
      });
    }
    clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx:any) => {
        const txId = tx.transactionId;
        clientMessenger.unsubscribe(txId);
        log.info(`Tx Hash mined message received at client ${JSON.stringify({
          id: txId,
          hash: tx.transactionHash,
          receipt: tx.receipt,
        })}`);
      },
      onHashGenerated: async (tx:any) => {
        const txHash = tx.transactionHash;
        const txId = tx.transactionId;
        log.info(`Tx Hash generated message received at client ${JSON.stringify({
          id: txId,
          hash: txHash,
        })}`);

        log.info(`Receive time for transaction id ${txId}: ${Date.now()}`);
        if (!res.writableEnded) {
          log.info(`Response sent to client for transaction id on success ${txId}`);
          return res.json(
            {
              code: 200,
              log: 'Meta transaction sent to blockchain',
              transactionId: txId,
              transactionHash: txHash,
              connectionUrl: websocketUrl,
            },
          );
        }
      },
      onError: async (tx:any) => {
        const err = tx.error;
        const txId = tx.transactionId;
        log.info(`Error message received at client is ${err}`);
        clientMessenger.unsubscribe(txId);

        if (!res.writableEnded) {
          log.info(`Response sent to client for transaction id on error ${txId}`);
          return res.json(
            {
              code: 417,
              message: 'Transaction failed',
              transactionId: txId,
              error: err,
              connectionUrl: websocketUrl,
            },
          );
        }
      },
    });
  } catch (error) {
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
