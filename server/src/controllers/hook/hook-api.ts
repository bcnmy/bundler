import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { CCMPWatchTower } from '../../services/ccmp/ccmp-watch-tower';

export const hookApi = async (req: Request, res: Response) => {
  // TODO: what data is needed exactly (storage vs processing)
  const {
    chainId, from, scAddress, event: eventName, data, txHash, gasUsage,
  } = req.body;

  const watchTower = new CCMPWatchTower(); // TODO: add watchtower to servicemanager?

  // TODO: check for connection closure
  watchTower.processTransaction(txHash, gasUsage, chainId, from, scAddress, eventName, data);

  res.status(StatusCodes.ACCEPTED).send('CCMP event webhook started processing.');
};
