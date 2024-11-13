import { CronJob } from "cron";
import { GasPriceService } from "../GasPrice";
import { logger } from "../../logger";
import { parseError } from "../../utils";
import { formatHrtimeSeconds } from "../../utils/timing";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * `CacheFeesJob` periodically fetches the gas values from RPC and saves them to the cache them for faster access.
 */
export class CacheFeesJob extends CronJob {
  /**
   * Creates a new `CacheFeesJob`.
   * @param schedule - The schedule on which the job should run.
   * @param gasPriceService - The service to be set up (each chain has it's own service).
   */
  constructor(
    private schedule: string,
    private gasPriceService: GasPriceService,
  ) {
    super(schedule, async () => {
      log.info(`Start ${this.pretty}`);
      try {
        const start = process.hrtime();
        await gasPriceService.setup();
        const end = process.hrtime(start);
        log.info(`Finish ${this.pretty} after=${formatHrtimeSeconds(end)}s`);
      } catch (err) {
        log.error(`Error running ${this.pretty}: ${parseError(err)} `);
      }
    });
  }

  // Get pretty name for logging
  public get pretty(): string {
    return `CacheFeesJob(chainID: ${this.gasPriceService.chainId}, schedule: '${this.schedule}')`;
  }
}
