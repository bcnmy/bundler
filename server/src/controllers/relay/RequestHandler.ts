import { Request, Response } from 'express';
import { TransactionType } from '../../../../common/types';
import { relayAATransaction } from './AARelay';
import { relaySCWTransaction } from './SCWRelay';

export const requestHandler = async (
  req: Request,
  res: Response,
) => {
  const { transactionType } = req.body;
  let response = null;
  if (transactionType === TransactionType.AA) {
    response = await relayAATransaction(req, res);
  } else if (transactionType === TransactionType.SCW) {
    response = await relaySCWTransaction(req, res);
  }
  if (!response) {
    return res.status(400).send({
      code: 400,
      message: 'Wrong transaction type sent in request',
    });
  }
  return response;
};
