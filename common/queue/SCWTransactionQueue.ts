import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { SCWTransactionMessageType, TransactionType } from '../types';
import { IQueue } from './interface/IQueue';

const log = logger(module);

const { queueUrl } = config;

export class SCWTransactionQueue implements IQueue<SCWTransactionMessageType> {
  private channel!: Channel;

  private transactionType: TransactionType = TransactionType.SCW;

  private exchangeName = `relayer_queue_exchange_${this.transactionType}`;

  private exchangeType = 'direct';

  chainId: number;

  queueName: string;

  msg!: ConsumeMessage | null;

  constructor(options: { chainId: number }) {
    this.chainId = options.chainId;
    this.queueName = `relayer_queue_${this.transactionType}_${this.chainId}`;
  }

  connect = async () => {
    const connection = await amqp.connect(queueUrl);
    if (!this.channel) {
      this.channel = await connection.createChannel();
      this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true,
      });
    }
  };

  publish = async (data: SCWTransactionMessageType) => {
    const key = `chainid.${this.chainId}.type.${this.transactionType}`;
    this.channel.prefetch(1);
    this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    log.info(`[x] Sent transaction to queue with transaction id ${data.transactionId}`);
    return true;
  };

  consume = async (onMessageReceived: () => void) => {
    log.info(`[x] Setting up consumer for queue with chain id ${this.chainId} for transaction type ${this.transactionType}`);
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const queue: Replies.AssertQueue = await this.channel.assertQueue(this.queueName);
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
