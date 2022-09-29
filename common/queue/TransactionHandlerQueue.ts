import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { IQueue } from './interface/IQueue';
import { TransactionMessageType } from './types';

const log = logger(module);

const { queueUrl } = config;

export class TransactionHandlerQueue implements IQueue<TransactionMessageType> {
  private channel!: Channel;

  chainId: number;

  msg!: ConsumeMessage | null;

  constructor(
    options: {
      chainId: number,
    },
  ) {
    this.chainId = options.chainId;
  }

  connect = async () => {
    const connection = await amqp.connect(queueUrl);
    if (!this.channel) {
      this.channel = await connection.createChannel();
      this.channel.assertExchange('transaction_queue_exchange', 'direct', {
        durable: true,
      });
    }
  };

  publish = async (data: TransactionMessageType) => {
    const key = `chainid.${this.chainId}`;
    this.channel.prefetch(1);
    this.channel.publish('transaction_queue_exchange', key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  };

  consume = async (onMessageReceived: () => void) => {
    this.channel.assertExchange('transaction_queue_exchange', 'direct', {
      durable: true,
    });
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const transactionQueue: Replies.AssertQueue = await this.channel.assertQueue('transaction_queue');

      const key = `chainid.${this.chainId}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId}`);
      this.channel.bindQueue(transactionQueue.queue, 'transaction_queue_exchange', key);
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
