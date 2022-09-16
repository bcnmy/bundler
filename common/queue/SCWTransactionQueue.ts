import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { SCWTransactionMessageType } from '../types';
import { IQueue } from './interface/IQueue';
import { logger } from '../log-config';

const log = logger(module);

const queueUrl = process.env.RELAYER_QUEUE_URL;

export class SCWTransactionQueue implements IQueue<SCWTransactionMessageType> {
  private channel!: Channel;

  chainId: number;

  transactionType?: string;

  msg!: ConsumeMessage | null;

  onMessageReceived: () => void;

  constructor(chainId: number, type: string, onMessageReceived: () => void) {
    this.onMessageReceived = onMessageReceived;
    this.chainId = chainId;
    this.transactionType = type;
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

  publish = async (data: SCWTransactionMessageType) => {
    const key = `chainid.${this.chainId}`;
    this.channel.prefetch(1);
    this.channel.publish(`relayer_queue_exchange_${this.transactionType}`, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  };

  consume = async () => {
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
      await this.channel.consume(queue.queue, this.onMessageReceived.bind(this));

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
