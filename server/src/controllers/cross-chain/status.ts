import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { crossChainTransactionStatusServiceMap } from '../../../../common/service-manager';
import { omit } from '../../utils/util';

const log = logger(module);

export const statusFromTxHashApi = async (req: Request, res: Response) => {
  const { sourceTxHash, chainId } = req.params;
  log.info(`Getting status for source transaction ${sourceTxHash} on chain ${chainId}...`);
  const result = await crossChainTransactionStatusServiceMap[
    Number(chainId)
  ].getStatusBySourceTransaction(sourceTxHash, Number(chainId));
  res.status(result.responseCode).json(omit(result, ['responseCode']));
};

export const statusFromMessageHashApi = async (req: Request, res: Response) => {
  const { messageHash, chainId } = req.params;
  log.info(`Getting status for message hash ${messageHash} on chain ${chainId}...`);
  const result = await crossChainTransactionStatusServiceMap[
    Number(chainId)
  ].getStatusByMessageHash(messageHash, Number(chainId));
  res.status(result.responseCode).json(omit(result, ['responseCode']));
};
