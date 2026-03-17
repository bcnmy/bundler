import { CronJob } from "cron";
import { GasPriceService } from "../GasPrice";
import { logger } from "../../logger";
import { logMeasureTime } from "../../utils/timing";
import { ActivityTracker } from "../ActivityTracker";
import { ICacheService } from "../../cache";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * `CacheFeesJob` periodically fetches the gas values from RPC and saves them to the cache them for faster access.
 * The interval is dynamically adjusted based on network activity.
 */
export class CacheFeesJob extends CronJob {
  private activityTracker: ActivityTracker;
  private lastRunTime: Map<number, number>;

  /**
   * Creates a new `CacheFeesJob`.
   * @param schedule - The base schedule on which the job should run.
   * @param gasPriceService - The service to be set up (each chain has it's own service).
   * @param cacheService - The cache service for storing activity data.
   */
  constructor(
    private schedule: string,
    private gasPriceService: GasPriceService,
    cacheService: ICacheService,
  ) {
    super(schedule, async () => {
      const { chainId } = this.gasPriceService;
      const _log = log.child({ chainId, schedule });
      _log.info(`Start CacheFeesJob`);

      try {
        // Check if we should run based on activity
        const recommendedInterval =
          await this.activityTracker.getRecommendedInterval(chainId);
        const lastRun = this.lastRunTime.get(chainId) || 0;
        const timeSinceLastRun = Date.now() - lastRun;

        if (timeSinceLastRun < recommendedInterval) {
          _log.info(
            { timeSinceLastRun, recommendedInterval },
            `Skipping cache update due to low activity`,
          );
          return;
        }

        logMeasureTime(_log, `Finish CacheFeesJob`, async () => {
          await gasPriceService.setup();
          this.lastRunTime.set(chainId, Date.now());
        });
      } catch (err) {
        _log.error({ err }, `Error running CacheFees job`);
      }
    });

    this.activityTracker = new ActivityTracker(cacheService);
    this.lastRunTime = new Map();
  }

  /**
   * Records activity for the chain associated with this job
   */
  recordActivity(): void {
    this.activityTracker.recordActivity(this.gasPriceService.chainId);
  }
}
