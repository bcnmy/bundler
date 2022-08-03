import amqp from 'amqplib';
import { logger } from '../../../common/log-config';
import { parseError, stringify } from '../utils/util';

const log = logger(module);

interface IDataToPushInQueue {
  transactionId: string;
  type: number;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  to: string;
  gasLimit: string;
  value: string;
  data: string;
  chainId: number;
}

const { RELAYER_QUEUE_URL = '', RELAYER_QUEUE_EXCHANGE = 'relayer_queue_exchange' } = process.env;

let channel: any;
(async () => {
  console.log('connecting to amqp on api-server', RELAYER_QUEUE_URL);
  amqp.connect(RELAYER_QUEUE_URL, async (err: any, connection: any) => {
    console.log('[AMQP] connected on api-server');
    channel = await connection.createChannel();
    channel.assertExchange(RELAYER_QUEUE_EXCHANGE, 'topic', {
      durable: true,
    });
  });
})();

export const sendToQueue = async (data: IDataToPushInQueue) => {
  try {
    log.info(`[x] Publishing to relayer ${stringify(data)}`);
    const key = `networkid.${data.chainId}`;
    channel.prefetch(1); // process one message at a time
    const msg = channel.publish(RELAYER_QUEUE_EXCHANGE, key, Buffer.from(stringify(data)), {
      persistent: true,
    });
    log.info(`[x] Sent ${msg}`);
    return {
      data: 'sent to queue',
    };
  } catch (error) {
    return {
      error: parseError(error),
    };
  }
};
