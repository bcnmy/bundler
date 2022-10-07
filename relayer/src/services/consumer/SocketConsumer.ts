import { CentClient } from 'cent.js';
import { ConsumeMessage } from 'amqplib';
import { logger } from '../../../../common/log-config';
import { IQueue } from '../../../../common/queue';
import { TransactionMessageType } from '../../../../common/queue/types';
import { ISocketConsumer } from './interface/ISocketConsumer';
import { config } from '../../../../config';
import { SocketConsumerParamsType } from './types';

const log = logger(module);
export class SocketConsumer implements ISocketConsumer {
  private queue: IQueue<TransactionMessageType>;

  chainId: number;

  socketClient: CentClient;

  constructor(
    socketConsumerParams: SocketConsumerParamsType,
  ) {
    const {
      options, queue,
    } = socketConsumerParams;
    this.socketClient = new CentClient({
      url: config.socketService.httpUrl,
      token: config.socketService.token,
    });

    this.queue = queue;
    this.chainId = options.chainId;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(msg.content.toString());
      log.info(`onMessage received in socket service on chain Id ${this.chainId}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);
      this.socketClient.publish({
        channel: `transaction:${transactionDataReceivedFromQueue.transactionId}`,
        data: {
          event: 'transactionMined',
        },
      });
    } else {
      throw new Error(`No msg received from queue in socket service on chainId: ${this.chainId}`);
    }
  };
}
