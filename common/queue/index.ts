import amqp, { Channel } from 'amqplib';
import { logger } from '../log-config';

const log = logger(module);

const exchange = 'relayer_queue_exchange'; // get from config instance
const queueUrl = ''; // get from config instance


export class Queue {
  private channel: any;

  private queue: any;

  private chainId: number;

  private transactionType: string;

  constructor(chainId: number, type: string) {
    this.chainId = chainId;
    this.transactionType = type;
  }

  connect = async () => {
    const connection = await amqp.connect(queueUrl);
    this.channel = await connection.createChannel();
    this.channel.assertExchange(`exchange_${this.transactionType}`, 'direct', {
      durable: true,
    });
  };

  sendToRelayer = async (data: object) => {
    const key = `chainid.${this.chainId}`;
    this.channel.prefetch(1);
    this.channel.publish(`exchange_${this.transactionType}`, key, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
  };

  setupConsumerInRelayer = async () => {
    this.channel.assertExchange(exchange, 'topic', {
      durable: true,
    });
    this.channel.prefetch(1);

    try {
      // setup a consumer
      this.queue = await this.channel.assertQueue(`relayer_queue_${this.chainId}_type_${this.transactionType}`);
      const key = `chainid.${this.chainId}.type.${this.transactionType}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId} with type ${this.transactionType}`);
      this.channel.bindQueue(this.queue.queue, exchange, key);
    } catch (error) {
      log.error(error);
    }
  };

  setupBatchConsumerInRelayer = async () => {
    this.channel.assertExchange(exchange, 'topic', {
      durable: true,
    });
    this.channel.prefetch(10);

    try {
      // setup a consumer
      this.queue = await this.channel.assertQueue(`relayer_queue_${this.chainId}_type_${this.transactionType}`);
      const key = `chainid.${this.chainId}.type.${this.transactionType}`;
      log.info(`[*] Waiting for transactions on network id ${this.chainId} with type ${this.transactionType}`);
      this.channel.bindQueue(this.queue.queue, exchange, key);
    } catch (error) {
      log.error(error);
    }
  };

  const listenForTransaction = async () => {
    await this.channel.consume(this.queue.queue, async (msg: any) => {
      // consumer instance map to call
    });
  };
}
