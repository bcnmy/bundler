import amqp from 'amqplib';
import { logger } from '../../log-config';

const log = logger(module);

const { RELAYER_QUEUE_URL = '' } = process.env;
let channel: any;
(async () => {
  const connection = await amqp.connect(RELAYER_QUEUE_URL);
  const queue = 'raw_transaction_queue';
  channel = await connection.createChannel();
  channel.assertQueue(queue, {
    durable: true,
  });
})();
const queue = 'raw_transaction_queue';

export const sendToQueue = async (data: object) => {
  const msg = channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });
  log.info(` [x] Sent ${msg}`);
};
