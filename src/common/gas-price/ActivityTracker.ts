import { ICacheService } from "../cache";
import config from "config";

interface ActivityWindow {
  timestamps: number[];
  windowSize: number; // in milliseconds
}

/**
 * Tracks network activity per chain to optimize RPC calls and caching frequency.
 *
 * This service helps reduce unnecessary RPC calls by dynamically adjusting the caching
 * frequency based on network activity. Instead of making RPC calls at fixed intervals
 * regardless of usage, it implements an intelligent caching strategy that:
 *
 * - Tracks activity using a sliding window (default 1 hour)
 * - Scales caching frequency based on actual usage
 * - Reduces RPC calls during periods of low activity
 * - Maintains responsive caching during high activity periods
 *
 * The caching interval is dynamically adjusted:
 * - Minimum interval: Chain-specific updateFrequencyInSeconds from config (high activity)
 * - Maximum interval: 1 hour (low/no activity)
 * - Scales linearly between these values based on activity level
 *
 * Activity is recorded whenever gas prices are requested, and the system
 * automatically adjusts the caching frequency based on this usage pattern.
 * This helps optimize resource usage and reduce unnecessary RPC calls,
 * particularly for networks with low or intermittent traffic.
 */
export class ActivityTracker {
  private activityWindows: Map<number, ActivityWindow>;
  private cacheService: ICacheService;

  constructor(cacheService: ICacheService) {
    this.activityWindows = new Map();
    this.cacheService = cacheService;
  }

  /**
   * Records activity for a specific chain
   * @param chainId - The chain ID to record activity for
   */
  async recordActivity(chainId: number): Promise<void> {
    const now = Date.now();
    const window = this.getOrCreateWindow(chainId);

    // Load existing timestamps from cache
    const cached = await this.cacheService.get(this.getActivityKey(chainId));
    if (cached) {
      window.timestamps = JSON.parse(cached);
    }

    // Add new timestamp
    window.timestamps.push(now);

    // Remove timestamps outside the window
    const cutoff = now - window.windowSize;
    window.timestamps = window.timestamps.filter((t) => t >= cutoff);

    // Update cache
    await this.cacheService.set(
      this.getActivityKey(chainId),
      JSON.stringify(window.timestamps),
    );
  }

  /**
   * Gets the activity level for a specific chain
   * @param chainId - The chain ID to get activity for
   * @returns The number of operations in the last window
   */
  async getActivityLevel(chainId: number): Promise<number> {
    const window = await this.getWindow(chainId);
    return window?.timestamps.length || 0;
  }

  /**
   * Gets the recommended caching interval based on activity
   * @param chainId - The chain ID to get interval for
   * @returns The recommended caching interval in milliseconds
   */
  async getRecommendedInterval(chainId: number): Promise<number> {
    const activityLevel = await this.getActivityLevel(chainId);

    // Get chain-specific minimum interval from config
    const configPath = `chains.updateFrequencyInSeconds.${chainId}`;
    const minIntervalSeconds = config.has(configPath)
      ? config.get<number>(configPath)
      : 15; // Default to 15 seconds if not specified
    const MIN_INTERVAL = minIntervalSeconds * 1000; // Convert to milliseconds
    const MAX_INTERVAL = 60 * 60 * 1000; // 1 hour

    if (activityLevel === 0) {
      return MAX_INTERVAL;
    }

    // Scale interval based on activity
    // More activity = shorter interval
    const scale = Math.min(1, activityLevel / 10); // Cap at 10 operations
    return MIN_INTERVAL + (MAX_INTERVAL - MIN_INTERVAL) * (1 - scale);
  }

  private getActivityKey(chainId: number): string {
    return `activity_window_${chainId}`;
  }

  private async getWindow(chainId: number): Promise<ActivityWindow | null> {
    const cached = await this.cacheService.get(this.getActivityKey(chainId));
    if (cached) {
      return {
        timestamps: JSON.parse(cached),
        windowSize: 60 * 60 * 1000, // 1 hour window
      };
    }
    return null;
  }

  private getOrCreateWindow(chainId: number): ActivityWindow {
    if (!this.activityWindows.has(chainId)) {
      this.activityWindows.set(chainId, {
        timestamps: [],
        windowSize: 60 * 60 * 1000, // 1 hour window
      });
    }
    return this.activityWindows.get(chainId)!;
  }
}
