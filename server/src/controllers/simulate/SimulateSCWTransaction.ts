import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { SCWSimulationService } from '../../../../common/simulation';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateSCWTransaction = async (req: Request, res: Response) => {
  try {
    const {
      to, data, chainId, refundInfo,
    } = req.body;

    // SCWSimulationService.simulate({
    //   chainId,
    //   data,
    //   to,
    //   refundInfo,
    // });
    return res.status(400).send({
      code: 400,
      message: 'Wrong transaction type sent in request',
    });
  } catch (error) {
    log.error(`Error in fetching fee otpions ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
