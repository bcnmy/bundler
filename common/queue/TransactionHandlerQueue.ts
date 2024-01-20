/* eslint-disable import/no-import-module-exports */
import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../logger';
import { TransactionQueueMessageType } from '../types';
import { IQueue } from './interface/IQueue';
import { parseError } from '../utils';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

const queueUrl = process.env.QUEUE_URL || config.queueUrl;

export class TransactionHandlerQueue implements IQueue<TransactionQueueMessageType> {
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
  }

  async publish(data: TransactionQueueMessageType) {
    const key = `chainid.${this.chainId}`;
    log.info(`Publishing data to transaction queue on chain id ${this.chainId} and key ${key}`);
    this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  }

  async consume(onMessageReceived: () => void) {
    log.info(`[x] Setting up consumer for queue with chainId: ${this.chainId} for transaction queue`);
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const transactionQueue: Replies.AssertQueue = await this.channel.assertQueue(
        `${this.queueName}_${this.chainId}`,
      );

      const key = `chainid.${this.chainId}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId}`);
      this.channel.bindQueue(transactionQueue.queue, this.exchangeName, key);
      await this.channel.consume(
        transactionQueue.queue,
        onMessageReceived,
      );

      return true;
    } catch (error) {
      log.error((parseError(error)));
      return false;
    }
  }

  async ack(data: ConsumeMessage) {
    this.channel.ack(data);
  }
}