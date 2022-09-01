import { createClient } from 'redis';
import { logger } from '../log-config';
import { parseError } from '../utils';

const log = logger(module);

export class RedisClient {
  private static instance: RedisClient;

  private client;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  connect = async (): Promise<Boolean> => {
    log.info('Initiating Redis connection');
    await this.client.connect();
    log.info('Main Redis connected successfully');
    this.client.on('error', (err: any) => {
      log.error(`Redis Client Error ${err}`);
      return false;
    });
    return true;
  };

  decrement = async (key: string): Promise<number> => {
    log.info(`Decrementing cache value by 1 => Key: ${key}`);
    log.info('checking if the key exists');
    // could use get service also here
    const val = await this.client.get(key);
    if (val == null || val === 'undefined') {
      log.info('key does not exist, nothing to decrement');
      return 0;
    }
    try {
      const result = await this.client.decrBy(key, 1);
      return result;
    } catch (error) {
      log.error(`Error in decrement value ${parseError(error)}`);
    }
    return 0;
  };

  deleteKey = async (key: string): Promise<boolean> => {
    log.info(`Deleting cahce value => Key: ${key}`);
    try {
      const result = await this.client.del(key);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(`Error in deleting key ${key} - ${parseError(error)}`);
      return false;
    }
  };

  expire = async (key: string, time: number): Promise<boolean> => {
    try {
      const result = await this.client.expire(key, time);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(parseError(error));
      return false;
    }
  };

  get = async (key: string): Promise<string> => {
    try {
      const result = await this.client.get(key) || '';
      return result;
    } catch (error) {
      log.error(`Error getting value for key ${key} - ${parseError(error)}`);
    }
    return '';
  };

  increment = async (key: string): Promise<boolean> => {
    log.info(`Inrementing cache value by 1 => Key: ${key}`);
    log.info('checking if the key exists');
    try {
      const val = await this.client.get(key);
      if (!val) {
        log.info('key does not exist, nothing to increment');
        return false;
      }

      const result = await this.client.incrBy(key, 1);
      if (result) {
        log.info(`Incremented cache value by 1 => Key: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      log.error(`Error in increment value - ${parseError(error)}`);
      return false;
    }
  };

  set = async (key: string, value: string, hideValueInLogs: boolean = true) => {
    if (!hideValueInLogs) {
      log.info(`Setting cache value => Key: ${key} Value: ${value}`);
    } else {
      log.info(`Setting value in cache with key: ${key}`);
    }
    try {
      await this.client.set(key, value);
    } catch (error) {
      log.error(`Error setting value $${value} for key ${key} - ${parseError(error)}`);
    }
  };
}
