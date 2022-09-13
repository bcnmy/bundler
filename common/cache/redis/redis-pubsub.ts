import { createClient } from 'redis';
import { logger } from '../../log-config';

const log = logger(module);

export class RedisPubSub {
  private static instance: RedisPubSub;

  private client;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
  }

  public static getInstance(): RedisPubSub {
    if (!RedisPubSub.instance) {
      RedisPubSub.instance = new RedisPubSub();
    }
    return RedisPubSub.instance;
  }

  connect = async () => {
    log.info('Initiating Redis PubSub connection');
    await this.client.connect();
    log.info('Redis PubSub connected successfully');
    this.client.on('error', (err: any) => log.error('Redis Client Error', err));
  };
}
