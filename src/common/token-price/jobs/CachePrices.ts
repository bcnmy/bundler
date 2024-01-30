/* eslint-disable import/no-import-module-exports */
import { CronJob } from "cron";
import { logger } from "../../logger";
import { parseError } from "../../utils";
import { formatHrtimeSeconds } from "../../utils/formatting";
import { CMCTokenPriceManager } from "../CMCTokenPriceManager";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * `CachePricesJob` periodically fetches the token prices from CMC API and saves them to the cache them for faster access.
 */
export class CachePricesJob extends CronJob {
  /**
   * Creates a new `CachePricesJob`.
   * @param schedule - The schedule on which the job should run.
   * @param priceManager - The service that's called periodically.
   */
  constructor(
    private schedule: string,
    private priceManager: CMCTokenPriceManager,
  ) {
    super(schedule, async () => {
      log.info(`Start ${this.pretty}`);
      try {
        const start = process.hrtime();
        await priceManager.setup();
        const end = process.hrtime(start);
        log.info(`Finish ${this.pretty} after=${formatHrtimeSeconds(end)}s`);
      } catch (err) {
        log.error(`Error running ${this.pretty}: ${parseError(err)} `);
      }
    });
  }

  // Get pretty name for logging
  public get pretty(): string {
    return `CachePricesJob(schedule='${this.schedule}', tokens=[${this.priceManager.tokens}])`;
  }
}
