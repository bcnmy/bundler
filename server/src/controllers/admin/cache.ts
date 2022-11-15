import { Request, Response } from 'express';
import { RedisCacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const deleteCacheAPI = async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    const { key } = req.body;
    if (secret !== 'j2AFV5Ni89kcU6jM') {
      return res.status(400).json({
        error: 'invalid request',
      });
    }
    await RedisCacheService.getInstance().delete(key);
    return res.json({
      msg: 'deleted cache',
    });
  } catch (error) {
    log.error(`Error in deleteCacheAPI ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
