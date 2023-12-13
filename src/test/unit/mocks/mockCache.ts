/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/indent */
import Redlock, { Lock } from 'redlock';
import { ICacheService } from '../../../common/cache/interface';
import { logger } from '../../../common/logger';

const log = logger.child({
  module: module.filename.split('/').slice(-4).join('/'),
});

export class MockCache implements ICacheService {
  redisClient: any;

  release() {
    this.redisClient = null;
  }

  async connect(): Promise<void> {
    log.info('Initiating Redis connection');
  }

  close(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  get(key: string): Promise<string> {
    return Promise.resolve('1000000000');
  }

  set(
    key: string,
    value: string,
    hideValueInLogs?: boolean | undefined
  ): Promise<boolean> {
    return Promise.resolve(true);
  }

  increment(key: string, incrementBy?: number | undefined): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  decrement(key: string, decrementBy?: number | undefined): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  expire(key: string, expiryTime: number): Promise<boolean> {
    return Promise.resolve(false);
  }

  delete(key: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  getRedLock(): any {
    return {
      acquire: async (resources: string[], duration: number) => true,
    };
  }

  unlockRedLock(lock: Lock): Promise<void> {
    throw new Error('Method not implemented.');
  }

  connectRedLock(): Redlock {
    return new Redlock([this.redisClient], {
      // the expected clock drift; for more details
      // see http://redis.io/topics/distlock
      driftFactor: 0.01, // multiplied by lock ttl to determine drift time

      // the max number of times Redlock will attempt
      // to lock a resource before erroring
      retryCount: 5,

      // the time in ms between attempts
      retryDelay: 8000, // time in ms

      // the max time in ms randomly added to retries
      // to improve performance under high contention
      // see https://www.awsarchitectureblog.com/2015/03/backoff.html
      retryJitter: 200, // time in ms
    });
  }
}
