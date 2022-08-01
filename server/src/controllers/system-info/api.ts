import { Request, Response } from 'express';
import { systemInfoAPIInstance } from '../../service-manager';
import { logger } from '../../../log-config';

const log = logger(module);

export const systemInfoAPI = async (req: Request, res: Response) => {
  try {
    const { networkId } = req.query;
    const n = networkId as string;
    if (!systemInfoAPIInstance[parseInt(n, 10)]) {
      return res.status(400).json({
        msg: `System info instance not initialised for network id ${networkId}`,
      });
    }
    const response = await systemInfoAPIInstance[parseInt(n, 10)].get();
    return res.status(200).json({
      response,
    });
  } catch (error) {
    log.error(`Error in systemInfoAPI ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
