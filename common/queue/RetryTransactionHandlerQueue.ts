/* eslint-disable import/no-import-module-exports */
import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../logger';
import { IQueue } from './interface/IQueue';
import { RetryTransactionQueueData } from './types';
import { parseError } from '../utils';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

const queueUrl = process.env.QUEUE_URL || config.queueUrl;

export class RetryTransactionHandlerQueue implements IQueue<RetryTransactionQueueData> {
  private channel!: Channel;

  exchangeName: string;

  private exchangeType = 'x-delayed-message';

  chainId: number;

  nodePathIndex: number;

  queueName: string;

  msg!: ConsumeMessage | null;

  constructor(
    options: {
      chainId: number,
      nodePathIndex: number
    },
  ) {
    this.chainId = options.chainId;
    this.nodePathIndex = options.nodePathIndex;
    this.exchangeName = `retry_transaction_queue_exchange_${this.nodePathIndex}`;
    this.queueName = `retry_transaction_queue_${this.nodePathIndex}`;
  }

  async connect() {
    const connection = await amqp.connect(queueUrl);
    if (!this.channel) {
      this.channel = await connection.createChannel();
      this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
        arguments: {
          'x-delayed-type': 'direct',
        },
      });
    }
  }

  async publish(data: RetryTransactionQueueData) {
    const key = `retry_chainid.${this.chainId}_${this.nodePathIndex}`;
    log.info(`Publishing data to retry queue on chainId: ${this.chainId} with interval ${config.chains.retryTransactionInterval[this.chainId]} and key ${key}`);
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
    log.info(`[x] Setting up consumer for queue with chainId: ${this.chainId} for retry transaction queue`);
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const retryTransactionQueue: Replies.AssertQueue = await this.channel.assertQueue(
        `${this.queueName}_${this.chainId}`,
      );
      const key = `retry_chainid.${this.chainId}_${this.nodePathIndex}`;

      log.info(`[*] Waiting for retry transactions on chainId: ${this.chainId}`);

      this.channel.bindQueue(retryTransactionQueue.queue, this.exchangeName, key);
      await this.channel.consume(
        retryTransactionQueue.queue,
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
