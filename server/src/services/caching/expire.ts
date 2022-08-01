import { logger } from '../../../log-config';
import { redisClient } from '../../db';
import { parseError } from '../../utils/util';

const log = logger(module);

export const expire = async (key: string, time: number): Promise<boolean> => {
  try {
    const result = await redisClient.expire(key, time);
    if (result) return true;
    return false;
  } catch (error) {
    log.error(parseError(error));
    return false;
  }
};
