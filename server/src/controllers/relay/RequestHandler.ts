import { Request, Response } from 'express';
import { TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../../middleware';
import { relayAATransaction } from './AARelay';
import { relayGaslessFallbackTransaction } from './GaslessFallbackRelay';
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
  } else if (method === TransactionMethodType.GASLESS_FALLBACK) {
    response = await relayGaslessFallbackTransaction(req, res);
  } else {
    return res.status(STATUSES.BAD_REQUEST).send({
      code: STATUSES.BAD_REQUEST,
      error: 'Wrong transaction type sent in request',
    });
  }
  return response;
};
