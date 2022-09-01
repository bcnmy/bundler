import { RedisClient } from './redis-client';
import { RedisPubSub } from './redis-pubsub';

export interface IRedisClient {
  getInstance(): RedisClient
  connect(): Promise<Boolean>
}

export interface IRedisPubSub {
  getInstance(): RedisClient
  connect(): Promise<Boolean>
}
