import { NextFunction, Request, Response } from 'express';
import { TransactionMethodType } from '../../../../common/types';
import { simulateAATransaction } from './SimulateAATransaction';
import { simulateGaslessFallbackTransaction } from './SimulateGaslessFallbackTransaction';
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
      response = await simulateAATransaction(req);
    } else if (method === TransactionMethodType.SCW) {
      response = await simulateSCWTransaction(req);
    } else if (method === TransactionMethodType.GASLESS_FALLBACK) {
      response = await simulateGaslessFallbackTransaction(req);
    }
    if (!response) {
      return res.status(500).send({
        code: 500,
        error: 'Response not received from simulation service',
      });
    }
    if ((response as any).code !== 200) {
      return res.status((response as any).code).send({
        code: (response as any).code,
        error: (response as any).msgFromSimulation,
      });
    }
    return next();
  } catch (error) {
    return res.status(500).send({
      code: 500,
      error: `Internal server error: ${JSON.stringify(error)}`,
    });
  }
};
