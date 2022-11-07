import { createClient } from 'redis';
import Redlock from 'redlock';
import { config } from '../../../config';
import { logger } from '../../log-config';
import { ICacheService } from '../interface';

const log = logger(module);

export class RedisCacheService implements ICacheService {
  private static instance: ICacheService;

  private redisClient;

  private redLock;

  private constructor() {
    this.redisClient = createClient({
      url: config.dataSources.redisUrl,
    });

    this.redLock = this.connectRedLock();
  }

  public static getInstance(): ICacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  async connect(): Promise<void> {
    log.info('Initiating Redis connection');
    await this.redisClient.connect();
    log.info('Main Redis connected successfully');
    this.redisClient.on('error', (err: any) => {
      log.error(`Redis redisClient Error ${err}`);
    });
  }

  connectRedLock(): Redlock {
    return new Redlock(
      [this.redisClient],
      {
        // the expected clock drift; for more details
        // see http://redis.io/topics/distlock
        driftFactor: 0.01, // multiplied by lock ttl to determine drift time

        // the max number of times Redlock will attempt
        // to lock a resource before erroring
        retryCount: 1,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200, // time in ms
      },
    );
  }

  getRedLock(): Redlock {
    return this.redLock;
  }

  // this.redlock.on('clientError', (err: object) => {
  //   try {
  //     log.info(`Failed to get redis lock ${err.toString()}`);
  //   } catch (error) {
  //     log.error(error);
  //   }
  // });

  async close(): Promise<void> {
    await this.redisClient.quit();
  }

  async decrement(key: string, decrementBy: number = 1): Promise<boolean> {
    log.info(`Checking if the key: ${key} exists`);
    // could use get service also here
    const val = await this.redisClient.get(key);
    if (val == null || val === 'undefined') {
      log.info('Key does not exist. Nothing to decrement');
      return false;
    }
    try {
      log.info(`Key exists. Decrementing cache value by ${decrementBy} => Key: ${key}`);
      await this.redisClient.decrBy(key, decrementBy);
      return true;
    } catch (error) {
      log.error(`Error in decrement value ${JSON.stringify(error)}`);
    }
    return false;
  }

  async delete(key: string): Promise<boolean> {
    log.info(`Deleting cahce value => Key: ${key}`);
    try {
      const result = await this.redisClient.del(key);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(`Error in deleting key ${key} - ${JSON.stringify(error)}`);
      return false;
    }
  }

  async expire(key: string, expiryTime: number): Promise<boolean> {
    try {
      log.info(`Setting expirtyTime: ${expiryTime} for key: ${key}`);
      const result = await this.redisClient.expire(key, expiryTime);
      if (result) return true;
      return false;
    } catch (error) {
      log.error(JSON.stringify(error));
      return false;
    }
  }

  async get(key: string): Promise<string> {
    try {
      log.info(`Getting key: ${key} from cache`);
      const result = await this.redisClient.get(key) || '';
      return result;
    } catch (error) {
      log.error(`Error getting value for key ${key} - ${JSON.stringify(error)}`);
    }
    return '';
  }

  async increment(key: string, incrementBy: number = 1): Promise<boolean> {
    log.info(`Checking if the key: ${key} exists`);
    try {
      const val = await this.redisClient.get(key);
      if (!val) {
        log.info('Key does not exist. Nothing to increment');
        return false;
      }

      log.info(`Inrementing cache value by ${incrementBy} => Key: ${key}`);
      const result = await this.redisClient.incrBy(key, incrementBy);
      if (result) {
        log.info(`Incremented cache value by ${incrementBy} => Key: ${key}`);
        return true;
      }
      return false;
    } catch (error) {
      log.error(`Error in increment value - ${JSON.stringify(error)}`);
      return false;
    }
  }

  async set(key: string, value: string, hideValueInLogs: boolean = false): Promise<boolean> {
    if (!hideValueInLogs) {
      log.info(`Setting cache value => Key: ${key} Value: ${value}`);
    } else {
      log.info(`Setting value in cache with key: ${key}`);
    }
    try {
      await this.redisClient.set(key, value);
      log.info(`Cache value set in logs for key: ${key}`);
      return true;
    } catch (error) {
      log.error(`Error setting value $${value} for key ${key} - ${JSON.stringify(error)}`);
      return false;
    }
  }
}
