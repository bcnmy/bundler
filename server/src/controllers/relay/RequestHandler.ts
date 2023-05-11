import { Request, Response } from 'express';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../../middleware';
import { relayAATransaction } from './AARelay';
import { relayGaslessFallbackTransaction } from './GaslessFallbackRelay';
import { relaySCWTransaction } from './SCWRelay';
import { getGasAndGasPrices } from './BundlerRelay.ts/GetGasAndGasPrices';

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
  } else if (method === EthMethodType.GAS_AND_GAS_PRICES) {
    response = await getGasAndGasPrices(req, res);
  } else {
    return res.status(STATUSES.BAD_REQUEST).send({
      code: STATUSES.BAD_REQUEST,
      error: 'Wrong transaction type sent in request',
    });
  }
  return response;
};
