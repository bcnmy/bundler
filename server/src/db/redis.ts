import { createClient } from 'redis';
import { logger } from '../../log-config';

const log = logger(module);

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

(async () => {
  let tries = 0;
  while (tries < 5) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await redisClient.connect();
      console.log('Redis connection created');
      break; // 'return' would work here as well
    } catch (err) {
      console.log('Redis Error', err);
    }
    tries += 1;
  }

  redisClient.on('error', (err:any) => log.info('Redis Client Error', err));
  redisClient.on('connect', () => {
    log.info('Redis redisClient connected');
  });
})();

export { redisClient };
