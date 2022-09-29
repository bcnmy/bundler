import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { AATransactionMessageType, TransactionType } from '../types';
import { IQueue } from './interface/IQueue';

const log = logger(module);

const { queueUrl } = config;

export class AATransactionQueue implements IQueue<TransactionMessageType> {
  private channel!: Channel;

  chainId: number;

  transactionType: string = TransactionType.AA;

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
    this.channel.assertExchange(`relayer_queue_exchange_${this.transactionType}`, 'direct', {
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
