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
    let response = null;
    if (method === TransactionMethodType.AA) {
      response = await simulateAATransaction(req, res);
    } else if (method === TransactionMethodType.SCW) {
      response = await simulateSCWTransaction(req, res);
    }
    if (!response) {
      return res.status(400).send({
        code: 400,
        message: 'Wrong transaction type sent in request',
      });
    }
    if ((response as any).code === 400) {
      return res.status(400).send({
        code: 400,
        message: (response as any).msgFromSimulation,
      });
    }
    return next();
  } catch (error) {
    return res.status(500).send({
      code: 500,
      message: `Internal server error: ${error}`,
    });
  }
};
