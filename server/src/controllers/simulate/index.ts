import { NextFunction, Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { TransactionType } from '../../../../common/types';
import { simulateService } from '../../services';

const log = logger(module);

export const simulateApi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      to, data, chainId, refundInfo, transactionType,
    } = req.body;
    switch (tranasctionType) {
      case TransactionType.AA:
        simulateAATransaction(req, res);
        next();
        break;
      case TransactionType.SCW:
        simulateSCWTransaction(req, res);
        next();
        break;
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
