import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { IQueue } from './interface/IQueue';
import { TransactionMessageType } from './types';

const log = logger(module);

const { queueUrl } = config;

export class TransactionHandlerQueue implements IQueue<TransactionMessageType> {
  private channel!: Channel;

  private exchangeName = 'transaction_queue_exchange';

  private exchangeType = 'direct';

  private queueName = 'transaction_queue';

  chainId: number;

  msg!: ConsumeMessage | null;

  constructor(
    options: {
      chainId: number,
    },
  ) {
    this.chainId = options.chainId;
  }

  async connect() {
    const connection = await amqp.connect(queueUrl);
    if (!this.channel) {
      this.channel = await connection.createChannel();
      this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
      });
    }
  };

  publish = async (data: TransactionMessageType) => {
    const key = `chainid.${this.chainId}`;
    log.info(`Publishing data to retry queue on chain id ${this.chainId} with interval ${config.chains.retryTransactionInterval[this.chainId]} and key ${key}`);
    this.channel.prefetch(1);
    this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  };

  consume = async (onMessageReceived: () => void) => {
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const transactionQueue: Replies.AssertQueue = await this.channel.assertQueue(this.queueName);

      const key = `chainid.${this.chainId}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId}`);
      this.channel.bindQueue(transactionQueue.queue, this.exchangeName, key);
      await this.channel.consume(
        transactionQueue.queue,
        onMessageReceived.bind(this),
      );

      return true;
    } catch (error) {
      log.error(error);
      return false;
    }
  };

  ack = async (data: ConsumeMessage) => {
    this.channel.ack(data);
  };
}
