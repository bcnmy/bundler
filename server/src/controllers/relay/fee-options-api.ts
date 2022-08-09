import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { feeOptionsService } from '../../services';

const log = logger(module);

export const feeOptionsApi = async (req: Request, res: Response) => {
  try {
    const {
      wallet, to, data,
    } = req.body;

    const result = await feeOptionsService(wallet, to, data);

    if (result.error) {
      return res.status(result.code).json({
        msg: 'bad request',
        error: result.error,
      });
    }
    return res.status(result.code).json({
      msg: result.msg,
      code: result.code,
    });
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
