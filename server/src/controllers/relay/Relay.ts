import { Request, Response } from 'express';
import { TransactionType } from '../../../../common/types';
import { relayAATransaction } from './AARelay';
import { relaySCWTransaction } from './SCWRelay';

export const relayApi = async (
  req: Request,
  res: Response,
) => {
  console.log(req.body);
  const { tranasctionType } = req.body;
  switch (tranasctionType) {
    case TransactionType.AA:
      return relayAATransaction(req, res);
    case TransactionType.SCW:
      return relaySCWTransaction(req, res);
    default:
      return res.status(400).send({
        code: 400,
        message: 'Wrong transaction type sent in request',
      });
  }
};
