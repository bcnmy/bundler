import { Request, Response } from 'express';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { config } from '../../../../../config';
import { parseError } from '../../../../../common/utils';
import { updateRequest } from '../../auth/UpdateRequest';

const log = logger(module);

export const getSupportedEntryPoints = async (req: Request, res: Response) => {
  const { id } = req.body;
  const { chainId, apiKey } = req.params;
  const bundlerRequestId = req.body.params[6];

  try {
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

    updateRequest({
      chainId: parseInt(chainId, 10),
      apiKey,
      bundlerRequestId,
      rawResponse: {
        jsonrpc: '2.0',
        id: id || 1,
        result: supportedEntryPoints,
      },
      httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    });

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: supportedEntryPoints,
    });
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${parseError(error)}`);
    updateRequest({
      chainId: parseInt(chainId, 10),
      apiKey,
      bundlerRequestId,
      rawResponse: {
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
          message: `Internal Server error: ${parseError(error)}`,
        },
      },
      httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    });
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
