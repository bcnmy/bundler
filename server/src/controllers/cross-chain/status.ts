import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { crossChainTransactionStatusServiceMap } from '../../../../common/service-manager';
import { omit } from '../../utils/util';

const log = logger(module);

export const statusFromTxHashApi = async (req: Request, res: Response) => {
  const { sourceTxHash, chainId } = req.query;
  log.info(`Getting status for source transaction ${sourceTxHash} on chain ${chainId}...`);
  const service = crossChainTransactionStatusServiceMap[Number(chainId)];
  if (!service) {
    res.status(StatusCodes.NOT_FOUND).send(`Chain ID ${chainId} not found`);
    return;
  }
  const result = await service.getStatusBySourceTransaction(String(sourceTxHash), Number(chainId));
  res.status(result.responseCode).json(omit(result, ['responseCode']));
};

export const statusFromMessageHashApi = async (req: Request, res: Response) => {
  const { messageHash, chainId } = req.query;
  log.info(`Getting status for message hash ${messageHash} on chain ${chainId}...`);
  const service = crossChainTransactionStatusServiceMap[Number(chainId)];
  if (!service) {
    res.status(StatusCodes.NOT_FOUND).send(`Chain ID ${chainId} not found`);
    return;
  }
  const result = await service.getStatusByMessageHash(String(messageHash), Number(chainId));
  res.status(result.responseCode).json(omit(result, ['responseCode']));
};
