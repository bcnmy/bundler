import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import { customJSONStringify } from "../../../../common/utils";
import { statusService } from "../../../../common/service-manager";

const filenameLogger = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// GET /health/:chainId
// Check the health of a specific chain supported by the bundler
export const health = async (req: Request, res: Response) => {
  const { chainId } = req.params;

  const log = filenameLogger.child({
    chainId,
  });

  try {
    // This shouldn't ever happen because we have a startup probe that checks if the status service is initialized,
    // but we want to keep it as a sanity check and return 503 so the users know it's gonna be available soon
    if (!statusService) {
      return res.status(503).json({
        chainId,
        healthy: false,
        errors: [
          "Status service not ready to accept requests yet, please wait",
        ],
      });
    }

    // if chainId is provided, return the health of a specific chain
    if (chainId) {
      const chainStatus = await statusService.checkChain(parseInt(chainId, 10));
      return res.status(chainStatus.healthy ? 200 : 500).json(chainStatus);
    }

    // otherwise, return the health of all chains
    const chainStatuses = await statusService.checkAllChains();
    return res
      .status(chainStatuses.every((cs) => cs.healthy) ? 200 : 500)
      .json(chainStatuses);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    log.error(`Error in /health/:chainId handler: ${customJSONStringify(err)}`);
    return res.status(500).json({
      chainId,
      healthy: false,
      errors: [err.message],
    });
  }
};
