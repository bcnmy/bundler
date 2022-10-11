import amqp, { Channel, ConsumeMessage, Replies } from 'amqplib';
import { config } from '../../config';
import { logger } from '../log-config';
import { IQueue } from './interface/IQueue';
import { TransactionMessageType } from './types';

const log = logger(module);

const { queueUrl } = config;

export class RetryTransactionHandlerQueue implements IQueue<TransactionMessageType> {
  private channel!: Channel;

  private exchangeName = 'funding_relayer_queue_exchange';

  private exchangeType = 'direct';

  chainId: number;

  private queueName = 'funding_relayer_queue';

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
    const key = `funding_chainid.${this.chainId}`;
    log.info(`Publishing data to funding queue on chain id ${this.chainId} with key ${key}`);
    if (this.channel) {
      this.channel.publish(this.exchangeName, key, Buffer.from(JSON.stringify(data)));
      return true;
    }
    return false;
  }

  async consume(onMessageReceived: () => void) {
    log.info(`[x] Setting up consumer for queue with chain id ${this.chainId} for retry transaction`);
    this.channel.prefetch(1);
    try {
      // setup a consumer
      const fundingRelayerQueue: Replies.AssertQueue = await this.channel.assertQueue(
        `${this.queueName}_${this.chainId}`,
      );
      const key = `funding_chainid.${this.chainId}`;

      log.info(`[*] Waiting for funding transactions on network id ${this.chainId}`);

      this.channel.bindQueue(fundingRelayerQueue.queue, this.exchangeName, key);
      await this.channel.consume(
        fundingRelayerQueue.queue,
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
