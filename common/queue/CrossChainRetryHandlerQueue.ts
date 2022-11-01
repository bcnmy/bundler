import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { IQueue } from './interface/IQueue';
import { CrossChainRetryQueueData } from './types';

const log = logger(module);

const { queueUrl } = config;

export class CrossChainRetryHandlerQueue implements IQueue<CrossChainRetryQueueData> {
  private channel!: Channel;

  private exchangeName = 'cross_chain_retry_queue_exchange';

  private exchangeType = 'x-delayed-message';

  chainId: number;

  private queueName = 'cross_chain_retry_queue';

  msg!: ConsumeMessage | null;

  constructor(options: { chainId: number }) {
    this.chainId = options.chainId;
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

  async publish(data: CrossChainRetryQueueData) {
    const key = `cross_chain_retry_chainid.${this.chainId}`;
    const retryInterval = config.ccmp.retryInterval[this.chainId][data.message.routerAdaptor];
    log.info(
      `Publishing data to cross chain retry queue on chainId: ${this.chainId} with interval ${retryInterval} and key ${key}`
    );
    if (this.channel) {
      this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)), {
        persistent: true,
        headers: { 'x-delay': retryInterval },
      });
      return true;
    }
    return false;
  }

  async consume(onMessageReceived: () => void) {
    log.info(
      `[x] Setting up consumer for queue with chainId: ${this.chainId} for cross chain retry queue`
    );
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const crossChainRetryQueue: Replies.AssertQueue = await this.channel.assertQueue(
        `${this.queueName}_${this.chainId}`
      );
      const key = `cross_chain_retry_chainid.${this.chainId}`;

      log.info(`[*] Waiting for retry transactions on chainId: ${this.chainId}`);

      this.channel.bindQueue(crossChainRetryQueue.queue, this.exchangeName, key);
      await this.channel.consume(crossChainRetryQueue.queue, onMessageReceived);

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
