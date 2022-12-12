import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { config } from '../../../../config';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const supportedRoutersAPI = async (req: Request, res: Response) => {
  try {
    res.status(StatusCodes.OK).json(config.ccmp.supportedRouters);
  } catch (e) {
    log.error(`Error getting Supported Protocols: ${JSON.stringify(e)}`);
    if (e instanceof Error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(e.message);
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Unknown Error');
    }
  }
};
