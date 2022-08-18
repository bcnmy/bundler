import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { simulateService } from '../../services';

const log = logger(module);

export const simulateApi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      to, data, chainId,
    } = req.body;
    console.log('to', to);
    console.log('data', data);
    console.log('chainId', chainId);
    const result = await simulateService(to, data, chainId);

    if (result.error) {
      return res.status(result.code).json({
        msg: 'bad request',
        error: result.error,
      });
    }
    return next();
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
