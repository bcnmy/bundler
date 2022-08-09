import { logger } from '../../../../common/log-config';
import { redisClient } from '../../../../common/db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const decrement = async (key: string): Promise<number> => {
  log.info(`Decrementing cache value by 1 => Key: ${key}`);
  log.info('checking if the key exists');
  // could use get service also here
  const val = await redisClient.get(key);
  if (val == null || val === 'undefined') {
    log.info('key does not exist, nothing to decrement');
    return 0;
  }
  try {
    const result = await redisClient.decrBy(key, 1);
    return result;
  } catch (error) {
    log.error(`Error in decrement value ${parseError(error)}`);
  }
  return 0;
};
