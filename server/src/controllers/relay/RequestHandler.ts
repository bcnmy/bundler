import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { TransactionMethodType } from '../../../../common/types';
import { relayAATransaction } from './AARelay';
import { relaySCWTransaction } from './SCWRelay';

export const requestHandler = async (
  req: Request,
  res: Response,
) => {
  const { method } = req.body;
  let response;
  if (method === TransactionMethodType.AA) {
    response = await relayAATransaction(req, res);
  } else if (method === TransactionMethodType.SCW) {
    response = await relaySCWTransaction(req, res);
  } else {
    return res.status(StatusCodes.BAD_REQUEST).send({
      code: StatusCodes.BAD_REQUEST,
      error: 'Wrong transaction type sent in request',
    });
  }
  return response;
};
