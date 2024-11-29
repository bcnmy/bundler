import { CronJob } from "cron";
import { GasPriceService } from "../GasPrice";
import { logger } from "../../logger";
import { logMeasureTime } from "../../utils/timing";

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
      const { chainId } = this.gasPriceService;
      const _log = log.child({ chainId, schedule });
      _log.info(`Start CacheFeesJob`);

      try {
        logMeasureTime(_log, `Finish CacheFeesJob`, async () => {
          await gasPriceService.setup();
        });
      } catch (err) {
        _log.error({ err }, `Error running CacheFees job`);
      }
    });
  }
}
