import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import { config } from "../../../../config";
import { parseError } from "../../../../common/utils";
import { BUNDLER_ERROR_CODES } from "../../shared/errors/codes";
import { STATUSES } from "../../shared/statuses";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const getSupportedEntryPoints = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const { chainId /* apiKey */ } = req.params;

    log.info(`chainId: ${chainId}`);

    const chainIdInInt = parseInt(chainId, 10);
    const { entryPointV07Data } = config;

    const supportedEntryPoints = [];

    for (const [entryPointAddress, chainIds] of Object.entries(
      entryPointV07Data,
    )) {
      if (chainIds.supportedChainIds.includes(chainIdInInt)) {
        supportedEntryPoints.push(entryPointAddress);
      }
    }

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: supportedEntryPoints,
    });
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${parseError(error)}`);
    const { id } = req.body;
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
