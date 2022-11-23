import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ccmpServiceMap } from '../../../../common/service-manager';
import { logger } from '../../../../common/log-config';
import { parseIndexerEvent } from '../../services/cross-chain/utils';

const log = logger(module);

export const processFromIndexerApi = async (req: Request, res: Response) => {
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

export const processApi = async (req: Request, res: Response) => {
  const { message, txHash } = req.body;
  const sourceChainId = parseInt(message.sourceChainId.toString(), 10);

  const ccmpService = ccmpServiceMap[sourceChainId];
  if (ccmpService) {
    res.status(StatusCodes.ACCEPTED).send('CCMP event webhook started processing.');
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('CCMP Service Not Initialized.');
    return;
  }

  (async () => {
    try {
      await ccmpService.processTransaction(message, txHash);
    } catch (e) {
      log.error(`Error processing transaction ${txHash} on chain ${sourceChainId}`, e);
    }
  })();
};
