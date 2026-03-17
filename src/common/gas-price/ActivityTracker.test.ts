import { ActivityTracker } from "./ActivityTracker";
import { ICacheService } from "../cache";
import config from "config";

// Mock the config module
jest.mock("config", () => ({
  has: jest.fn(),
  get: jest.fn(),
}));

describe("ActivityTracker", () => {
  let activityTracker: ActivityTracker;
  let mockCacheService: jest.Mocked<ICacheService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock cache service with all required methods
    mockCacheService = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(""),
      set: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      expire: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(0),
      increment: jest.fn().mockResolvedValue(0),
      decrement: jest.fn().mockResolvedValue(0),
      acquireRedLock: jest.fn().mockResolvedValue(undefined),
      releaseRedLock: jest.fn().mockResolvedValue(undefined),
      unlockRedLock: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      getRedLock: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICacheService>;

    activityTracker = new ActivityTracker(mockCacheService);
  });

  describe("recordActivity", () => {
    it("should record activity and update cache", async () => {
      const chainId = 1;
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now);

      await activityTracker.recordActivity(chainId);

      // Verify cache was updated with the timestamp
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `activity_window_${chainId}`,
        JSON.stringify([now]),
      );
    });

    it("should maintain sliding window of timestamps", async () => {
      const chainId = 1;
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;

      // Mock cache to return existing timestamps
      mockCacheService.get.mockResolvedValueOnce(
        JSON.stringify([twoHoursAgo, oneHourAgo]),
      );

      jest.spyOn(Date, "now").mockReturnValue(now);
      await activityTracker.recordActivity(chainId);

      // Verify old timestamp was removed and new one added
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `activity_window_${chainId}`,
        JSON.stringify([oneHourAgo, now]),
      );
    });
  });

  describe("getActivityLevel", () => {
    it("should return 0 when no activity recorded", async () => {
      const chainId = 1;
      mockCacheService.get.mockResolvedValueOnce("");

      const level = await activityTracker.getActivityLevel(chainId);
      expect(level).toBe(0);
    });

    it("should return correct number of activities in window", async () => {
      const chainId = 1;
      const timestamps = [Date.now() - 1000, Date.now() - 2000];
      mockCacheService.get.mockResolvedValueOnce(JSON.stringify(timestamps));

      const level = await activityTracker.getActivityLevel(chainId);
      expect(level).toBe(2);
    });
  });

  describe("getRecommendedInterval", () => {
    beforeEach(() => {
      // Mock config to return specific interval for chain 1
      (config.has as jest.Mock).mockImplementation((path) => {
        return path === "chains.updateFrequencyInSeconds.1";
      });
      (config.get as jest.Mock).mockImplementation((path) => {
        if (path === "chains.updateFrequencyInSeconds.1") return 10;
        return 15; // Default
      });
    });

    it("should return maximum interval when no activity", async () => {
      const chainId = 1;
      jest.spyOn(activityTracker, "getActivityLevel").mockResolvedValue(0);

      const interval = await activityTracker.getRecommendedInterval(chainId);
      expect(interval).toBe(60 * 60 * 1000); // 1 hour
    });

    it("should return configured interval when at max activity", async () => {
      const chainId = 1;
      jest.spyOn(activityTracker, "getActivityLevel").mockResolvedValue(10);

      const interval = await activityTracker.getRecommendedInterval(chainId);
      expect(interval).toBe(10 * 1000); // 10 seconds
    });

    it("should scale interval based on activity level", async () => {
      const chainId = 1;
      jest.spyOn(activityTracker, "getActivityLevel").mockResolvedValue(5);

      const interval = await activityTracker.getRecommendedInterval(chainId);
      // Should be halfway between min and max
      expect(interval).toBeGreaterThan(10 * 1000);
      expect(interval).toBeLessThan(60 * 60 * 1000);
    });

    it("should use default interval when chain not configured", async () => {
      const chainId = 999; // Non-existent chain
      (config.has as jest.Mock).mockReturnValue(false);
      jest.spyOn(activityTracker, "getActivityLevel").mockResolvedValue(10);

      const interval = await activityTracker.getRecommendedInterval(chainId);
      expect(interval).toBe(15 * 1000); // 15 seconds
    });
  });
});
