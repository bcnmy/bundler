import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
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
      response = await simulateAATransaction(req);
    } else if (method === TransactionMethodType.SCW) {
      response = await simulateSCWTransaction(req);
    }
    if (!response) {
      return res.status(StatusCodes.BAD_REQUEST).send({
        code: StatusCodes.BAD_REQUEST,
        error: 'Response not received from simulation service',
      });
    }
    if ((response as any).code !== StatusCodes.OK) {
      return res.status((response as any).code).send({
        code: (response as any).code,
        error: (response as any).msgFromSimulation,
      });
    }
    return next();
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error: `Internal server error: ${error}`,
    });
  }
};
