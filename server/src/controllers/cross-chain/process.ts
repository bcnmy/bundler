import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ccmpServiceMap } from '../../../../common/service-manager';
import { logger } from '../../../../common/log-config';
import { parseIndexerEvent } from '../../../../cross-chain/utils';

const log = logger(module);

export const processApi = async (req: Request, res: Response) => {
  const { chainId, data, txHash } = req.body;

  const ccmpService = ccmpServiceMap[chainId];
  if (ccmpService) {
    res.status(StatusCodes.ACCEPTED).send('CCMP event webhook started processing.');
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('CCMP Service Not Initialized.');
    return;
  }

  (async () => {
    try {
      await ccmpService.processTransaction(parseIndexerEvent(data), txHash);
    } catch (e) {
      log.error(`Error processing transaction ${txHash} on chain ${chainId}`, e);
    }
  })();
};
