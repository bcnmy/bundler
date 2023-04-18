import { Request, Response } from 'express';
import { EthMethodType, TransactionMethodType } from '../../../../common/types';
import { STATUSES } from '../../middleware';
import {
  addUserOperationToMempool,
  getChainId,
  estimateUserOperationGas,
  getUserOperationByHash,
  getUserOperationReceipt,
  getSupportedEntryPoints,
} from './BundlerRelay.ts';

export const bundlerRequestHandler = async (
  req: Request,
  res: Response,
) => {
  const { method } = req.body;
  let response;
  switch (method) {
    case TransactionMethodType.BUNDLER:
      response = await addUserOperationToMempool(req, res);
      break;
    case EthMethodType.ESTIMATE_USER_OPERATION_GAS:
      response = await estimateUserOperationGas(req, res);
      break;
    case EthMethodType.GET_USER_OPERATION_BY_HASH:
      response = await getUserOperationByHash(req, res);
      break;
    case EthMethodType.GET_USER_OPERATION_RECEIPT:
      response = await getUserOperationReceipt(req, res);
      break;
    case EthMethodType.SUPPORTED_ENTRY_POINTS:
      response = await getSupportedEntryPoints(req, res);
      break;
    case EthMethodType.CHAIN_ID:
      response = await getChainId(req, res);
      break;
    default:
      return res.status(STATUSES.BAD_REQUEST).send({
        code: STATUSES.BAD_REQUEST,
        error: 'Wrong transaction type sent in request',
      });
  }

  return response;
};
