/* eslint-disable import/no-import-module-exports */
import { Request, Response } from 'express';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/logger';
// import { updateRequest } from '../../auth/UpdateRequest';
import { customJSONStringify, parseError } from '../../../../../common/utils';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const getChainId = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    log.info(`chainId in number: ${chainId}`);

    const chainIdInHex = `0x${(parseInt(chainId, 10).toString(16))}`;
    log.info(`chainId in hex: ${chainIdInHex}`);

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     result: chainIdInHex,
    //   },
    //   httpResponseCode: STATUSES.SUCCESS,
    // });

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: chainIdInHex,
    });
  } catch (error) {
    log.error(`Error in getChainId handler ${customJSONStringify(error)}`);
    const { id } = req.body;
    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
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
