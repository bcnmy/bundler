import { Channel, ConsumeMessage, Replies, Connection } from "amqplib";
import nodeconfig from "config";
import { logger } from "../logger";
import { IQueue } from "./interface/IQueue";
import { RetryTransactionQueueData } from "./types";
import { customJSONStringify } from "../utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class RetryTransactionHandlerQueue
  implements IQueue<RetryTransactionQueueData>
{
  private channel!: Channel;

  exchangeName: string;

  private exchangeType = "x-delayed-message";

  chainId: number;

  nodePathIndex: number;

  queueName: string;

  msg!: ConsumeMessage | null;

  private queueUrl: string;

  private retryTransactionInterval: number;

  constructor(options: {
    chainId: number;
    nodePathIndex: number;
    queueUrl?: string;
  }) {
    this.chainId = options.chainId;
    this.nodePathIndex = options.nodePathIndex;
    this.exchangeName = `retry_transaction_queue_exchange_${this.nodePathIndex}`;
    this.queueName = `retry_transaction_queue_${this.nodePathIndex}`;
    this.queueUrl = nodeconfig.get<string>("queueUrl");
    this.retryTransactionInterval = nodeconfig.has(
      `chains.retryTransactionInterval.${this.chainId}`,
    )
      ? nodeconfig.get(`chains.retryTransactionInterval.${this.chainId}`)
      : 30_000;
  }

  async connect(connection: Connection) {
    const _log = log.child({
      chainId: this.chainId,
      queueName: this.queueName,
      exchangeName: this.exchangeName,
      nodePathIndex: this.nodePathIndex,
    });

    try {
      if (!this.channel) {
        this.channel = await connection.createChannel();
        this.channel
          .assertExchange(this.exchangeName, this.exchangeType, {
            durable: true,
            arguments: {
              "x-delayed-type": "direct",
            },
          })
          .catch((err) => {
            _log.error({ err }, `Error while calling assertExchange()`);
          });
      }
    } catch (err) {
      _log.error({ err }, `Error while connecting to the queue`);
    }
  }

  async publish(data: RetryTransactionQueueData) {
    const key = `retry_chainid.${this.chainId}_${this.nodePathIndex}`;
    const _log = log.child({
      key,
      retryTransactionInterval: this.retryTransactionInterval,
      transactionId: data.transactionId,
    });

    _log.info({ data }, `Publishing data to retry queue`);

    try {
      if (this.channel) {
        this.channel.publish(
          this.exchangeName,
          key,
          Buffer.from(customJSONStringify(data)),
          {
            persistent: true,
            headers: {
              "x-delay": this.retryTransactionInterval,
            },
          },
        );
        return true;
      }
      return false;
    } catch (err) {
      _log.error({ err }, `Error while publishing the data to the queue`);
      return false;
    }
  }

  async consume(onMessageReceived: () => void) {
    const _log = log.child({
      chainId: this.chainId,
      queueName: this.queueName,
      exchangeName: this.exchangeName,
      nodePathIndex: this.nodePathIndex,
    });

    _log.info(`Setting up consumer for retry transaction queue`);
    this.channel.prefetch(1).catch((err) => {
      _log.error({ err }, `Error while prefetching`);
    });
    try {
      // setup a consumer
      const retryTransactionQueue: Replies.AssertQueue =
        await this.channel.assertQueue(`${this.queueName}_${this.chainId}`);
      const key = `retry_chainid.${this.chainId}_${this.nodePathIndex}`;

      _log.info(`Waiting for retry transactions`);

      this.channel
        .bindQueue(retryTransactionQueue.queue, this.exchangeName, key)
        .catch((err) => {
          _log.error({ err }, `Error while binging queue`);
        });
      await this.channel.consume(
        retryTransactionQueue.queue,
        onMessageReceived,
      );

      return true;
    } catch (err) {
      _log.error({ err }, `Error while consuming retry transaction queue`);
      return false;
    }
  }

  async ack(data: ConsumeMessage) {
    const _log = log.child({
      chainId: this.chainId,
      queueName: this.queueName,
      exchangeName: this.exchangeName,
      nodePathIndex: this.nodePathIndex,
    });

    try {
      this.channel.ack(data);
    } catch (err) {
      _log.error({ err }, `Error while acknowledging message`);
    }
  }
}
