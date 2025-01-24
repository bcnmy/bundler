import amqp, { Channel, ConsumeMessage } from "amqplib";
import nodeconfig from "config";
import { logger } from "../logger";
import { SendUserOperation, TransactionType } from "../types";
import { IQueue } from "./interface/IQueue";
import { customJSONStringify } from "../utils";
import { shouldDiscardStaleMessage } from "./queueUtils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const queueUrl =
  process.env.BUNDLER_QUEUE_URL || nodeconfig.get<string>("queueUrl");

export class BundlerTransactionQueue implements IQueue<SendUserOperation> {
  readonly chainId: number;

  private channel!: Channel;

  private transactionType: TransactionType = TransactionType.BUNDLER;

  private exchangeName = `relayer_queue_exchange_${this.transactionType}`;

  private exchangeType = "direct";

  private prefetch = 1;

  private exchangeKey: string;

  private queueName: string;

  constructor(options: { chainId: number }) {
    this.chainId = options.chainId;
    this.exchangeKey = `chainid.${this.chainId}.type.${this.transactionType}`;
    this.queueName = `relayer_queue_${this.chainId}_type_${this.transactionType}`;
  }

  async connect() {
    const _log = log.child({
      chainId: this.chainId,
      transactionType: this.transactionType,
      queueName: this.queueName,
      exchangeKey: this.exchangeKey,
    });
    
    try {
      const connection = await amqp.connect(queueUrl);
      if (!this.channel) {
        this.channel = await connection.createChannel();
        this.channel.assertExchange(this.exchangeName, this.exchangeType, {
          durable: true,
        }).catch((err) => {
          _log.error({ err }, `BundlerTransactionQueue:: assertExchange() failed`);    
        });
      }
    } catch (err) {
      _log.error({ err }, `BundlerTransactionQueue:: Error while connecting to the queue`);
    }
  }

  async publish(data: SendUserOperation) {
    const key = this.exchangeKey;
    const _log = log.child({
      data,
      key,
      transactionId: data.transactionId,
    });

    _log.info(`BundlerTransactionQueue:: Publishing data to retry queue`);

    try {
      if (shouldDiscardStaleMessage(this.chainId, data, Date.now())) {
        _log.warn(`BundlerTransactionQueue:: Discarding message because it's stale`);
        return true;
      }
  
      this.channel.publish(
        this.exchangeName,
        key,
        Buffer.from(customJSONStringify(data)),
        {
          persistent: true,
        },
      );
      return true;
    } catch (err) {
      _log.error({ err }, `BundlerTransactionQueue:: Error while publishing the data to the queue`);
      return false;
    }
  }

  async consume(onMessageReceived: () => void) {
    const _log = log.child({
      chainId: this.chainId,
      transactionType: this.transactionType,
      queueName: this.queueName,
      exchangeKey: this.exchangeKey,
    });

    this.channel.prefetch(this.prefetch).catch((err) => {
      _log.error({ err }, `BundlerTransactionQueue:: Error while prefetching`);
    });

    _log.info(`BundlerTransactionQueue:: Setting up consumer for queue`);
    try {
      // setup a consumer
      const queue = await this.channel.assertQueue(this.queueName);

      this.channel.bindQueue(queue.queue, this.exchangeName, this.exchangeKey).catch((err) => {
        _log.error({ err }, `BundlerTransactionQueue:: Error while binding queue`);
      });

      _log.info(`BundlerTransactionQueue:: Waiting for transactions...`);
      await this.channel.consume(queue.queue, onMessageReceived);

      return true;
    } catch (err) {
      _log.error({ err }, `BundlerTransactionQueue:: Error while consuming queue`);
      return false;
    }
  }

  async ack(data: ConsumeMessage) {
    const _log = log.child({
      chainId: this.chainId,
      transactionType: this.transactionType,
      queueName: this.queueName,
      exchangeKey: this.exchangeKey,
    });

    try {
      this.channel.ack(data);
    } catch (err) {
      _log.error({ err }, `BundlerTransactionQueue:: Error while acknowledging `);
    }
  }
}
