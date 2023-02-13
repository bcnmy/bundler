import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { feeOptionMap } from '../../../../common/service-manager';
import { STATUSES } from '../../middleware';

const log = logger(module);

export const feeOptionsApi = async (req: Request, res: Response) => {
  const chainId = req.query.chainId as string;
  const response = await feeOptionMap[Number(chainId)].get();
  try {
    if (response.error) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.json({
      code: STATUSES.SUCCESS,
      data: {
        chainId,
        ...response,
      },
    });
  } catch (error) {
    log.error(`Error in fee option ${error}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in fee option ${error}`,
    });
  }
};
