import { logger } from '../../../../common/log-config';
import { redisClient } from '../../../../common/db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const get = async (key: string): Promise<string> => {
  try {
    const result = await redisClient.get(key) || '';
    return result;
  } catch (error) {
    log.error(`Error getting value for key ${key} - ${parseError(error)}`);
  }
  return '';
};
