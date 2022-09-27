import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { aaSimulatonServiceMap } from '../../../../common/service-manager';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateAATransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      chainId, userOp,
    } = req.body;
    aaSimulatonServiceMap[chainId].simulate(userOp);
    next();
    return res.status(400).send({
      code: 400,
      message: 'Wrong transaction type sent in request',
    });
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
