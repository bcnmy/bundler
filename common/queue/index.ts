import amqp from 'amqplib';

const exchange = ''; // get from config instance
const queueUrl = ''; // get from config instance

export class Queue implements IQueue {
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
    this.channel.assertExchange(exchange, 'topic', {
      durable: true,
    });
  };

  sendToRelayer = async (data: Object) => {
    const key = `chainid.${this.chainId}.type.${this.transactionType}`;
    this.channel.prefetch(1);
    this.channel.publish(exchange, key, Buffer.from(JSON.stringify(data)), {
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
    } catch () {
      
    }
  }

  const consumeInRelayer = async () => {
    await this.channel.consume(this.queue.queue, async (msg: any) => {

    });
  }
}
