import { NextFunction, Request, Response } from 'express';
import { TransactionType } from '../../../../common/types';
import { simulateAATransaction } from './SimulateAATransaction';
import { simulateSCWTransaction } from './SimulateSCWTransaction';

export const simulateApi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tranasctionType } = req.body;
    switch (tranasctionType) {
      case TransactionType.AA:
        await simulateAATransaction(req, res);
        break;
      case TransactionType.SCW:
        await simulateSCWTransaction(req, res);
        break;
      default:
        return res.status(400).send({
          code: 400,
          message: 'Wrong transaction type sent in request',
        });
    }
    return next();
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Wrong transaction type sent in request',
    });
  }
};
