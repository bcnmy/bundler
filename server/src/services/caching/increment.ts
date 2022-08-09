import { logger } from '../../../log-config';
import { redisClient } from '../../db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const increment = async (key: string): Promise<boolean> => {
  log.info(`Inrementing cache value by 1 => Key: ${key}`);
  log.info('checking if the key exists');
  try {
    const val = await redisClient.get(key);
    if (!val) {
      log.info('key does not exist, nothing to increment');
      return false;
    }

    const result = await redisClient.incrBy(key, 1);
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
