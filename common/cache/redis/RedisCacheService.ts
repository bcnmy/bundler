import { createClient } from 'redis';
import { logger } from '../../log-config';
import { parseError } from '../../utils';
import { ICacheService } from '../interface';

const log = logger(module);

export class RedisCacheService implements ICacheService {
  private static instance: ICacheService;

  private redisClient;

  private constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
    });
  }

  public static getInstance(): ICacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  connect = async (): Promise<Boolean> => {
    log.info('Initiating Redis connection');
    await this.redisClient.connect();
    log.info('Main Redis connected successfully');
    this.redisClient.on('error', (err: any) => {
      log.error(`Redis redisClient Error ${err}`);
      return false;
    });
    return true;
  };

  decrement = async (key: string, decrementBy: number = 1): Promise<boolean> => {
    log.info(`Decrementing cache value by ${decrementBy} => Key: ${key}`);
    log.info('checking if the key exists');
    // could use get service also here
    const val = await this.redisClient.get(key);
    if (val == null || val === 'undefined') {
      log.info('key does not exist, nothing to decrement');
      return false;
    }
    try {
      await this.redisClient.decrBy(key, decrementBy);
      return true;
    } catch (error) {
      log.error(`Error in decrement value ${parseError(error)}`);
    }
    return false;
  };

  delete = async (key: string): Promise<boolean> => {
    log.info(`Deleting cahce value => Key: ${key}`);
    try {
      const result = await this.redisClient.del(key);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(`Error in deleting key ${key} - ${parseError(error)}`);
      return false;
    }
  };

  expire = async (key: string, expiryTime: number): Promise<boolean> => {
    try {
      const result = await this.redisClient.expire(key, expiryTime);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(parseError(error));
      return false;
    }
  };

  get = async (key: string): Promise<string> => {
    try {
      const result = await this.redisClient.get(key) || '';
      return result;
    } catch (error) {
      log.error(`Error getting value for key ${key} - ${parseError(error)}`);
    }
    return '';
  };

  increment = async (key: string, incrementBy: number = 1): Promise<boolean> => {
    log.info(`Inrementing cache value by ${incrementBy} => Key: ${key}`);
    log.info('checking if the key exists');
    try {
      const val = await this.redisClient.get(key);
      if (!val) {
        log.info('key does not exist, nothing to increment');
        return false;
      }

      const result = await this.redisClient.incrBy(key, incrementBy);
      if (result) {
        log.info(`Incremented cache value by ${incrementBy} => Key: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      log.error(`Error in increment value - ${parseError(error)}`);
      return false;
    }
  };

  set = async (key: string, value: string, hideValueInLogs: boolean = false): Promise<boolean> => {
    if (!hideValueInLogs) {
      log.info(`Setting cache value => Key: ${key} Value: ${value}`);
    } else {
      log.info(`Setting value in cache with key: ${key}`);
    }
    try {
      await this.redisClient.set(key, value);
      return true;
    } catch (error) {
      log.error(`Error setting value $${value} for key ${key} - ${parseError(error)}`);
      return false;
    }
  };
}
