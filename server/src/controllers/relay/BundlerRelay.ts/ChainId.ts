import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';

const log = logger(module);

export const getChainId = async (req: Request, res: Response) => {
  try {
    const { chainId } = req.params;
    log.info(`chainId in number: ${chainId}`);

    const chainIdInHex = parseInt(chainId, 10).toString(16);
    log.info(`chainId in hex: ${chainIdInHex}`);

    return {
      jsonrpc: '2.0',
      id: 1,
      result: chainIdInHex,
    };
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
