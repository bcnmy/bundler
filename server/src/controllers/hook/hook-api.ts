import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ccmpServiceMap } from '../../../../common/service-manager';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const hookApi = async (req: Request, res: Response) => {
  const {
    chainId, from, scAddress, event: eventName, data, txHash, gasUsage,
  } = req.body;

  const ccmpService = ccmpServiceMap[chainId];
  if (ccmpService) {
    res.status(StatusCodes.ACCEPTED).send('CCMP event webhook started processing.');
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('CCMP Service Not Initialized.');
    return;
  }

  (async () => {
    try {
      await ccmpService.processTransaction({
        txHash,
        gasUsage,
        chainId,
        from,
        scAddress,
        eventName,
        eventData: data,
      });
    } catch (e) {
      log.error(`Error processing transaction ${txHash} on chain ${chainId}`, e);
    }
  })();
};
