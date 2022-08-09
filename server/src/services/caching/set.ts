import { logger } from '../../../../common/log-config';
import { redisClient } from '../../../../common/db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const set = async (key: string, value: string, hideValueInLogs: boolean = true) => {
  if (!hideValueInLogs) {
    log.info(`Setting cache value => Key: ${key} Value: ${value}`);
  } else {
    log.info(`Setting value in cache with key: ${key}`);
  }
  try {
    await redisClient.set(key, value);
  } catch (error) {
    log.error(`Error setting value $${value} for key ${key} - ${parseError(error)}`);
  }
};
