import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';

const log = logger(module);

export const relayApi = async (req: Request, res: Response) => {
  try {
    // call relayer project
    return res.json({
      msg: 'all ok',
    });
  } catch (error) {
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
