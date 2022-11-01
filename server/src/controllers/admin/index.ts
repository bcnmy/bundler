import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const adminApi = async (req: Request, res: Response) => {
  // ability to change config at run time

  // change fallback urls of provider
  // change provider url

  // update minRelayerCount
  // update maxRelayerCount
  // update inactiveRelayerCountThreshold
  // update pendingTransactionCountThreshold
  // update fundingRelayerAmount

  // update gas price frequency
  // update gas price multiplier

  // update refund receiver address
};
