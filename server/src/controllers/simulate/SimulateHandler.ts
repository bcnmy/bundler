import { NextFunction, Request, Response } from 'express';
import { TransactionMethodType } from '../../../../common/types';
import { simulateAATransaction } from './SimulateAATransaction';
import { simulateSCWTransaction } from './SimulateSCWTransaction';

export const simulateTransaction = () => async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { method } = req.body;
    if (method === TransactionMethodType.AA) {
      await simulateAATransaction(req, res, next);
    } else if (method === TransactionMethodType.SCW) {
      await simulateSCWTransaction(req, res, next);
    }
    return next();
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: 'Wrong transaction type sent in request',
    });
  }
};
