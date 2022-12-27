import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { RedisCacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const deleteCacheAPI = async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    const { key } = req.body;
    if (secret !== 'j2AFV5Ni89kcU6jM') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'invalid request',
      });
    }
    await RedisCacheService.getInstance().delete(key);
    return res.json({
      msg: 'deleted cache',
    });
  } catch (error) {
    log.error(`Error in deleteCacheAPI ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error,
    });
  }
};

export const getCacheAPI = async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    const { key } = req.body;
    if (secret !== 'j2AFV5Ni89kcU6jM') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'invalid request',
      });
    }
    const data = await RedisCacheService.getInstance().get(key);
    if (data) {
      return res.json({
        msg: 'fetched cache',
        data,
      });
    }

    return res.status(StatusCodes.NOT_FOUND).json({
      msg: 'cache not found',
    });
  } catch (error) {
    log.error(`Error in deleteCacheAPI ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error,
    });
  }
};

export const postCacheAPI = async (req: Request, res: Response) => {
  try {
    const { secret } = req.query;
    const { key, value } = req.body;
    if (secret !== 'j2AFV5Ni89kcU6jM') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'invalid request',
      });
    }
    const data = await RedisCacheService.getInstance().set(key, value);
    if (data) {
      return res.json({
        msg: 'saved in cache',
        data: value,
      });
    }

    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: 'cache not saved',
    });
  } catch (error) {
    log.error(`Error in deleteCacheAPI ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error,
    });
  }
};
