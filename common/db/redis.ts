import { createClient } from 'redis';
import { logger } from '../log-config';

const log = logger(module);

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

const redisPubSub = createClient({
  url: process.env.REDIS_URL,
});

(async () => {
  try {
    log.info('Initiating Redis connection');
    await redisClient.connect();
    log.info('Main Redis connected successfully');
    redisClient.on('error', (err: any) => log.error('Redis Client Error', err));

    log.info('Initiating Redis PubSub connection');
    await redisPubSub.connect();
    log.info('Redis PubSub connected successfully');
  } catch (error) {
    console.log('error in redis connection of server ', error);
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((r) => setTimeout(r, 5000));
    process.exit(1);
  }

  // await redisPubSub.sendCommand(['config', 'set', 'notify-keyspace-events', 'KEA']);
})();

export { redisClient, redisPubSub };
