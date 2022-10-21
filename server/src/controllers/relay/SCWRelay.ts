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
              flag: 200,
              log: 'Meta transaction sent to blockchain',
              message: 'Meta transaction sent to blockchain',
              retryDuration: 100,
              transactionId: txId,
              txHash,
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
              flag: 417,
              log: 'Transaction failed',
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
    log.error(`Error in SCW relay ${error}`);
    return res.status(500).json({
      error: JSON.stringify(error),
    });
  }
};
