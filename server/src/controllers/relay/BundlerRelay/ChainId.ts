import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';

const log = logger(module);

export const getChainId = async (req: Request, res: Response) => {
  try {
    const { chainId } = req.params;
    log.info(`chainId in number: ${chainId}`);

    const chainIdInHex = `0x${(parseInt(chainId, 10).toString(16))}`;
    log.info(`chainId in hex: ${chainIdInHex}`);

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: 1,
      result: chainIdInHex,
    });
  } catch (error) {
    log.error(`Error in getChainId handler ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
