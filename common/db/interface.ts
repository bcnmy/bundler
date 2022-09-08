import { RedisClient } from './redis-client';
import { RedisPubSub } from './redis-pubsub';

export interface IDBService {
  getInstance(): any
  connect(): void
  close(): void
}
export interface IRedisClient {
  getInstance(): RedisClient
  connect(): Promise<Boolean>
}

export interface IRedisPubSub {
  getInstance(): RedisClient
  connect(): Promise<Boolean>
}
