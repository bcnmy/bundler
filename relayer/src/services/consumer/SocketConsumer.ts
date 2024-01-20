/* eslint-disable import/no-import-module-exports */
import { ConsumeMessage } from 'amqplib';
import { CentClient } from 'cent.js';
import { logger } from '../../../../common/logger';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, SocketEventType, TransactionQueueMessageType } from '../../../../common/types';
import { config } from '../../../../config';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ISocketConsumer } from './interface/ISocketConsumer';
import { SocketConsumerParamsType } from './types';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });
export class SocketConsumer implements ISocketConsumer {
  chainId: number;

  socketClient: CentClient;

  private queue: IQueue<TransactionQueueMessageType>;

  EVMRelayerManagerMap: {
    [name: string] : {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    }
  };

  constructor(
    socketConsumerParams: SocketConsumerParamsType,
  ) {
    const {
      options,
      queue,
    } = socketConsumerParams;
    this.socketClient = new CentClient({
      url: config.socketService.httpUrl,
      token: process.env.SOCKET_SERVICE_API_KEY || config.socketService.apiKey,
    });
    this.chainId = options.chainId;
    this.queue = queue;
    this.EVMRelayerManagerMap = options.EVMRelayerManagerMap;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      const transactionDataReceivedFromQueue: TransactionQueueMessageType = JSON.parse(
        msg.content.toString(),
      );
      log.info(`Message received from transction queue in socket service on chain Id ${this.chainId}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);
      try {
        if (transactionDataReceivedFromQueue.event === SocketEventType.onTransactionMined
          && transactionDataReceivedFromQueue.receipt?.from) {
          log.info(`Calling Relayer Manager ${transactionDataReceivedFromQueue.relayerManagerName} for chainId: ${this.chainId} and relayerAddress: ${transactionDataReceivedFromQueue.receipt.from} onTransactionMined event to update the balance and pending count`);
          await this.EVMRelayerManagerMap[
            transactionDataReceivedFromQueue.relayerManagerName][this.chainId]
            .postTransactionMined(transactionDataReceivedFromQueue.receipt?.from);
        }

        log.info(`Publishing back to socketClient ${this.chainId}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
        const token = process.env.SOCKET_SERVICE_API_KEY || config.socketService.apiKey;

        log.info(` Socket service HTTPURL ${this.chainId}: ${config.socketService.httpUrl} and token ${token}`);

        this.socketClient.publish({
          channel: `transaction:${transactionDataReceivedFromQueue.transactionId}`,
          data: {
            transactionId: transactionDataReceivedFromQueue.transactionId,
            transactionHash: transactionDataReceivedFromQueue?.transactionHash,
            event: transactionDataReceivedFromQueue.event,
            receipt: transactionDataReceivedFromQueue?.receipt,
          },
        });
      } catch (error) {
        log.error(`Failed to send to client on socket server with error: ${JSON.stringify(error)}`);
      }
    } else {
      log.info(`No msg received from queue in socket service on chainId: ${this.chainId}`);
    }
  };
}