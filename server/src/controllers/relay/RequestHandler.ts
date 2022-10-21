import { Request, Response } from 'express';
import { TransactionMethodType } from '../../../../common/types';
import { relayAATransaction } from './AARelay';
import { relaySCWTransaction } from './SCWRelay';

export const requestHandler = async (
  req: Request,
  res: Response,
) => {
  const { method } = req.body;
  let response = null;
  if (method === TransactionMethodType.AA) {
    response = await relayAATransaction(req, res);
  } else if (method === TransactionMethodType.SCW) {
    response = await relaySCWTransaction(req, res);
  } else {
    return res.status(400).send({
      code: 400,
      message: 'Wrong transaction type sent in request',
    });
  }
  console.log('///////', response);
  if (!response) {
    return res.status(500).send({
      code: 500,
      message: 'Something went error. Could not get response',
    });
  }
  return response;
};
