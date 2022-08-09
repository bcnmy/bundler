import { logger } from '../../../../common/log-config';
import { redisClient } from '../../../../common/db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const deleteKey = async (key: string): Promise<boolean> => {
  log.info(`Deleting cahce value => Key: ${key}`);
  try {
    const result = await redisClient.del(key);
    if (result) return true;
    return false;
  } catch (error) {
    log.error(`Error in deleting key ${key} - ${parseError(error)}`);
    return false;
  }
};
