import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { scwSimulationServiceMap } from '../../../../common/service-manager';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateSCWTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      to, data, chainId, refundInfo,
    } = req.body.params;

    await scwSimulationServiceMap[chainId].simulate({
      to,
      data,
      chainId,
      refundInfo,
    });
    next();
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
