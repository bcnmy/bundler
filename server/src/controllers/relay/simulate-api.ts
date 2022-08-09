import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { simulateService } from '../../services';

const log = logger(module);

export const simulateApi = async (req: Request, res: Response) => {
  try {
    const {
      wallet, data, chainId,
    } = req.body;

    const result = await simulateService(wallet, data, chainId);

    if (result.error) {
      return res.status(result.code).json({
        msg: 'bad request',
        error: result.error,
      });
    }
    return res.status(result.code).json({
      msg: result.msg,
      code: result.code,
      data: result.data,
    });
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
