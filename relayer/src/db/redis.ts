import { createClient } from 'redis';
import { logger } from '../../log-config';

const log = logger(module);
const REDIS_CONN_URL = `redis://${process.env.REDIS_USERNAME}${process.env.REDIS_PASSWORD ? ':' : ''}${process.env.REDIS_PASSWORD}${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = createClient({
  url: REDIS_CONN_URL,
});

const redisPubSub = createClient({
  url: REDIS_CONN_URL,
});

(async () => {
  log.info('Initiating Redis connection');
  await redisClient.connect();
  log.info('Main Redis connected successfully');
  redisClient.on('error', (err: any) => log.error('Redis Client Error', err));

  log.info('Initiating Redis PubSub connection');
  await redisPubSub.connect();
  log.info('Redis PubSub connected successfully');

  // await redisPubSub.sendCommand(['config', 'set', 'notify-keyspace-events', 'KEA']);
})();

export { redisClient, redisPubSub };
