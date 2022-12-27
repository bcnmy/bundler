import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../common/log-config';
import { feeOptionMap } from '../../../../common/service-manager';

const log = logger(module);

export const feeOptionsApi = async (req: Request, res: Response) => {
  const chainId = req.query.chainId as string;
  const response = await feeOptionMap[Number(chainId)].get();
  try {
    if (response.error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        code: StatusCodes.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.json({
      code: StatusCodes.OK,
      data: {
        chainId,
        ...response,
      },
    });
  } catch (error) {
    log.error(`Error in fee option ${error}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      error,
    });
  }
};
