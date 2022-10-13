import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { IQueue } from './interface/IQueue';
import { TransactionMessageType } from './types';

const log = logger(module);

const { queueUrl } = config;

export class RetryTransactionHandlerQueue implements IQueue<TransactionMessageType> {
  private channel!: Channel;

  private exchangeName = 'retry_transaction_queue_exchange';

  private exchangeType = 'direct';

  chainId: number;

  private queueName = 'retry_transaction_queue';

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
  }

  async publish(data: TransactionMessageType) {
    const key = `retry_chainid.${this.chainId}`;
    log.info(`Publishing data to retry queue on chain id ${this.chainId} with interval ${config.chains.retryTransactionInterval[this.chainId]} and key ${key}`);
    if (this.channel) {
      this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)), {
        persistent: true,
        headers: { 'x-delay': config.chains.retryTransactionInterval[this.chainId] },
      });
      return true;
    }
    return false;
  }

  async consume(onMessageReceived: () => void) {
    log.info(`[x] Setting up consumer for queue with chain id ${this.chainId} for retry transaction`);
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const retryTransactionQueue: Replies.AssertQueue = await this.channel.assertQueue(
        `${this.queueName}_${this.chainId}`,
      );
      const key = `retry_chainid.${this.chainId}`;

      log.info(`[*] Waiting for retry transactions on network id ${this.chainId}`);

      this.channel.bindQueue(retryTransactionQueue.queue, this.exchangeName, key);
      await this.channel.consume(
        retryTransactionQueue.queue,
        onMessageReceived,
      );

      return true;
    } catch (error) {
      log.error(error);
      return false;
    }
  }

  async ack(data: ConsumeMessage) {
    this.channel.ack(data);
  }
}
