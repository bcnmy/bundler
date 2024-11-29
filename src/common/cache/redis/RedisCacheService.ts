import Redlock, { Lock } from "redlock";
import Redis from "ioredis";
import nodeconfig from "config";
import { config } from "../../../config";
import { logger } from "../../logger";
import { ICacheService } from "../interface";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class RedisCacheService implements ICacheService {
  private static instance: ICacheService;

  private redisClient;

  private redLock: Redlock | undefined;

  private constructor() {
    // If cluster host is specified in the config, connect to the cluster
    if (nodeconfig.has("redisCluster.host")) {
      this.redisClient = new Redis.Cluster(
        [
          {
            host: nodeconfig.get("redisCluster.host"),
            port: nodeconfig.get("redisCluster.port"),
          },
        ],
        {
          lazyConnect: true,
          redisOptions: {
            reconnectOnError: () =>
              nodeconfig.get("redisCluster.reconnectOnError"),
          },
          enableOfflineQueue: nodeconfig.get("redisCluster.enableOfflineQueue"),
          maxRedirections: nodeconfig.get("redisCluster.maxRedirections"),
          retryDelayOnFailover: nodeconfig.get(
            "redisCluster.retryDelayOnFailover",
          ),
          scaleReads: nodeconfig.get("redisCluster.scaleReads"),
        },
      );
      // otherwise connect to a single Redis instance
    } else {
      this.redisClient = new Redis(config.dataSources.redisUrl, {
        lazyConnect: true,
      });
    }
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

  getRedLock(): Redlock | undefined {
    if (this.redLock) return this.redLock;
    return undefined;
  }

  async unlockRedLock(redisLock: Lock) {
    try {
      if (redisLock && this.redLock) {
        await this.redLock.release(redisLock);
      } else {
        log.error(
          { redisLock: redisLock.toString() },
          "Redlock not initialized",
        );
      }
    } catch (err) {
      log.error(
        { err, redisLock: redisLock.toString() },
        `Error during redLock.release`,
      );
    }
  }

  /**
   * Method gets instance of RedisCacheService
   * @returns RedisCacheService
   */
  public static getInstance(): ICacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService();
    }
    return RedisCacheService.instance;
  }

  /**
   * Method creates connection to redis client instance
   */
  async connect(): Promise<void> {
    const _log = log.child({
      redisUrl: config.dataSources.redisUrl,
      status: this.redisClient.status,
    });
    try {
      _log.info(`Connecting to Redis`);
      await this.redisClient.connect();
      _log.info(`Connected to Redis`);
    } catch (err) {
      log.info({ err }, `Error in RedisCacheService.connect()`);
      throw err;
    }
    this.redLock = this.connectRedLock();

    this.redLock.on("clientError", (err: object) => {
      _log.info({ err }, `redlock.clientError`);
    });
    this.redisClient.on("error", (err: unknown) => {
      log.error({ err }, `redisClient.clientError`);
    });
  }

  /**
   * Method closes connection to redis client instance
   */
  async close(): Promise<void> {
    await this.redisClient.quit();
  }

  /**
   * Method decrements value in cache
   * @param key of the value to be decremented
   * @param decrementBy amount to decrement
   * @returns true or false basis on success or failure
   */
  async decrement(key: string, decrementBy: number = 1): Promise<boolean> {
    const _log = log.child({ key, decrementBy });

    // could use get service also here
    const val = await this.redisClient.get(key);
    if (val == null || val === "undefined") {
      _log.info("Key does not exist. Nothing to decrement");
      return false;
    }
    try {
      _log.info(`Key exists. Decrementing cache value`);
      await this.redisClient.decrby(key, decrementBy);
      return true;
    } catch (err) {
      _log.error({ err }, `Error in RedisCacheService.decrement()`);
    }
    return false;
  }

  /**
   * Method deletes value in cache
   * @param key of the value to be deleted
   * @returns true or false basis on success or failure
   */
  async delete(key: string): Promise<boolean> {
    const _log = log.child({ key });
    try {
      _log.info(`RedisCacheService.delete()`);
      const result = await this.redisClient.del(key);
      if (result) return true;
      return false;
    } catch (err) {
      log.error({ err }, `Error in RedisCacheService.delete()`);
      return false;
    }
  }

  /**
   * Method sets value in cache with expiry time
   * @param key of the value that is to be set with expriry
   * @param expiryTime to be set in cache in seconds
   * @returns true or false basis on success or failure
   */
  async expire(key: string, expiryTime: number): Promise<boolean> {
    const _log = log.child({ key, expiryTime });
    try {
      _log.info(`RedisCacheService.expire`);
      const result = await this.redisClient.expire(key, expiryTime);
      if (result) return true;
      return false;
    } catch (err) {
      log.error({ err }, "Error in RedisCacheService.expire");
      return false;
    }
  }

  /**
   * Method gets value set for a key
   * @param key
   * @returns string value that is set in cache
   */
  async get(key: string): Promise<string> {
    const _log = log.child({ key });
    try {
      _log.info(`RedisCacheService.get()`);
      const result = (await this.redisClient.get(key)) || "";
      return result;
    } catch (err) {
      _log.error({ err }, `Error in RedisCacheService.get`);
    }
    return "";
  }

  /**
   * Method increments value of the passed key
   * @param key
   * @param incrementBy units to increment by
   * @returns true or false basis on success or failure
   */
  async increment(key: string, incrementBy: number = 1): Promise<boolean> {
    const _log = log.child({ key, incrementBy });
    try {
      const val = await this.redisClient.get(key);
      if (!val) {
        _log.info("Key does not exist. Nothing to increment");
        return false;
      }

      _log.info(`Inrementing cache value`);
      const result = await this.redisClient.incrby(key, incrementBy);
      if (result) {
        _log.info(`Incremented cache value`);
        return true;
      }
      return false;
    } catch (err) {
      _log.error({ err }, `Error in RedisCacheService.increment`);
      return false;
    }
  }

  /**
   * Method sets values in cache for the passed key
   * @param key
   * @param value
   * @param hideValueInLogs true or false if value to be hidden in logs
   * @returns true or false basis on success or failure
   */
  async set(
    key: string,
    value: string,
    hideValueInLogs: boolean = false,
  ): Promise<boolean> {
    const _log = hideValueInLogs
      ? log.child({ key })
      : log.child({ key, value });

    _log.info(`RedisCacheService.set`);
    try {
      await this.redisClient.set(key, value);
      return true;
    } catch (err) {
      _log.error({ err }, `Error in RedisCacheService.set()`);
      return false;
    }
  }
}
