import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { config } from '../../../../../config';

const log = logger(module);

export const getSupportedEntryPoints = async (req: Request, res: Response) => {
  try {
    const { chainId } = req.params;
    log.info(`chainId: ${chainId}`);

    const chainIdInInt = parseInt(chainId, 10);
    const { entryPointData } = config;

    const supportedEntryPoints = [];

    for (
      let entryPointIndex = 0;
      entryPointIndex < entryPointData[chainIdInInt].length;
      entryPointIndex += 1
    ) {
      const entryPoint = entryPointData[chainIdInInt][entryPointIndex];
      supportedEntryPoints.push(entryPoint.address);
    }

    return {
      jsonrpc: '2.0',
      id: 1,
      result: supportedEntryPoints,
    };
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
