/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";
import { getLogger } from "../../../../common/logger";
import { config } from "../../../../config";
import { parseError } from "../../../../common/utils";
// import { updateRequest } from '../../auth/UpdateRequest';

const log = getLogger(module);

export const getSupportedEntryPoints = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    log.info(`chainId: ${chainId}`);

    const chainIdInInt = parseInt(chainId, 10);
    const { entryPointData } = config;

    const supportedEntryPoints = [];

    for (const [entryPointAddress, chainIds] of Object.entries(
      entryPointData,
    )) {
      if (chainIds.supportedChainIds.includes(chainIdInInt)) {
        supportedEntryPoints.push(entryPointAddress);
      }
    }

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     result: supportedEntryPoints,
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: supportedEntryPoints,
    });
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${parseError(error)}`);
    const { id } = req.body;
    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
