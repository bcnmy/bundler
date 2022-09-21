import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { TransactionType } from '../../../../common/types';

const log = logger(module);

export const simulateApi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tranasctionType } = req.body;
    switch (tranasctionType) {
      case TransactionType.AA:
        return simulateAATransaction(req, res);
        next();
      case TransactionType.SCW:
        return simulateSCWTransaction(req, res);
        next();
      default:
        return res.status(400).send({
          code: 400,
          message: 'Wrong transaction type sent in request',
        });
    }
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
