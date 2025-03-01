import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import { statusService } from "../../../../common/service-manager";
import { customJSONStringify } from "../../../../common/utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// GET /info/<chainId>
// Returns basic information about a supported chain on the bundler, currently only relayer info.
export const info = async (req: Request, res: Response) => {
  const { chainId } = req.params;
  if (!chainId) {
    return res.status(400).json({
      error: "chainId is required",
    });
  }

  try {
    // This shouldn't ever happen because we have a startup probe that checks if the status service is initialized,
    // but we want to keep it as a sanity check and return 503 so the users know it's gonna be available soon
    if (!statusService) {
      return res
        .status(503)
        .send("Status service not ready to accept requests yet, please wait");
    }

    const statusInfo = await statusService.info(parseInt(chainId));

    return res.status(200).json(statusInfo);
  } catch (err: unknown) {
    log.error(`Error in /info handler: ${customJSONStringify(err)}`);
    return res.status(500).send(customJSONStringify(err));
  }
};
