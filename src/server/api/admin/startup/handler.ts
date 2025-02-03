import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import { STATUSES } from "../../shared/statuses";
import { customJSONStringify } from "../../../../common/utils";
import { statusService } from "../../../../common/service-manager";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

// startup probe should return 200 if the service startup is complete and it's ready to start accepting requests.
// This should be called before we start running liveness and readiness checks.
export const startupProbe = async (req: Request, res: Response) => {
  try {
    // The status service is initialized last in the service manager, so if it's not initialized yet, we should return 503
    if (!statusService) {
      return res.status(503).json({ ok: false, errors: [] });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    log.error(`Error in startupProbe handler ${customJSONStringify(error)}`);
    res
      .status(STATUSES.INTERNAL_SERVER_ERROR)
      .json({ ok: false, errors: [error.message] });
  }

  return res.status(200).json({ ok: true, errors: [] });
};
