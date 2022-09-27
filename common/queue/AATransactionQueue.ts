import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { AATransactionMessageType } from '../types';
import { IQueue } from './interface/IQueue';
import { logger } from '../log-config';
import { config } from '../../config';

const log = logger(module);

const { queueUrl } = config;

export class AATransactionQueue implements IQueue<AATransactionMessageType> {
  private channel!: Channel;

  chainId: number;

  transactionType?: string;

  msg!: ConsumeMessage | null;

  constructor(
    options: {
      chainId: number,
      transactionType: string,
    },
  ) {
    this.chainId = options.chainId;
    this.transactionType = options.transactionType;
  }

  connect = async () => {
    const connection = await amqp.connect(queueUrl);
    if (!this.channel) {
      this.channel = await connection.createChannel();
      this.channel.assertExchange(`relayer_queue_exchange_${this.transactionType}`, 'direct', {
        durable: true,
      });
    }
  };

  publish = async (data: AATransactionMessageType) => {
    const key = `chainid.${this.chainId}`;
    this.channel.prefetch(1);
    this.channel.publish(`relayer_queue_exchange_${this.transactionType}`, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  };

  consume = async (onMessageReceived: () => void) => {
    this.channel.assertExchange(`relayer_queue_exchange_${this.transactionType}`, 'topic', {
      durable: true,
    });
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const queue: Replies.AssertQueue = await this.channel.assertQueue(`relayer_queue_${this.chainId}_type_${this.transactionType}`);
      const key = `chainid.${this.chainId}.type.${this.transactionType}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId} with type ${this.transactionType}`);
      this.channel.bindQueue(queue.queue, `relayer_queue_exchange_${this.transactionType}`, key);
      await this.channel.consume(
        queue.queue,
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
