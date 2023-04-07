import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { gasPriceServiceMap } from '../../../../common/service-manager';
import { config } from '../../../../config';
import { STATUSES } from '../../middleware';

const { supportedNetworks } = config;

const log = logger(module);

export const fetchGasPrice = async (req: Request, res: Response) => {
  try {
    log.info(`fetchGasPrice for chainId ${req.body.params}`);
    const chainId = req.body.params;

    if (!supportedNetworks.includes(Number(chainId))) {
      return res.status(STATUSES.NOT_FOUND).json({
        code: STATUSES.NOT_FOUND,
        message: `ChainId ${chainId} is not supported`,
      });
    }
    const gasPrice = await gasPriceServiceMap[chainId]?.getGasPrice();
    if (typeof gasPrice !== 'string') {
      log.info(`Gas price for chainId: ${chainId} is: ${JSON.stringify(gasPrice)}`);

      return res.status(STATUSES.SUCCESS).json({
        status: STATUSES.SUCCESS,
        message: `Gas Price for ChainId ${chainId} fetched successfully`,
        maxPriorityFeePerGas: gasPrice?.maxPriorityFeePerGas,
        maxFeePerGas: gasPrice?.maxFeePerGas,
        gasPrice: null,
      });
    }
    log.info(`Gas price for chainId: ${chainId} is: ${gasPrice}`);
    return res.status(STATUSES.SUCCESS).json({
      status: STATUSES.SUCCESS,
      message: `Gas Price for ChainId ${chainId} fetched successfully`,
      maxPriorityFeePerGas: null,
      maxFeePerGas: null,
      gasPrice,
    });
  } catch (error) {
    log.error(`Error in Gasless Fallback relay ${error}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: JSON.stringify(error),
    });
  }
};
