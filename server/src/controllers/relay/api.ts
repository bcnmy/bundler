import { Request, Response } from 'express';
import { logger } from '../../../log-config';

const log = logger(module);

export const relayApi = async (req: Request, res: Response) => {
  try {
    // call relayer project
  } catch (error) {
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
