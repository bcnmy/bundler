import { GasPriceService } from "./GasPrice";
import { GasPriceType } from "./types";
import { ICacheService } from "../cache";
import { INetworkService } from "../network";
import { IEVMAccount } from "../../relayer/account";
import { EVMRawTransactionType } from "../types";
import { ActivityTracker } from "./ActivityTracker";

// Mock dependencies
jest.mock("../cache");
jest.mock("../network");
jest.mock("./ActivityTracker");

/**
 * @jest-environment ./test-environment
 */

describe("GasPriceService", () => {
  let gasPriceService: GasPriceService;
  let mockCacheService: jest.Mocked<ICacheService>;
  let mockNetworkService: jest.Mocked<
    INetworkService<IEVMAccount, EVMRawTransactionType>
  >;
  let mockActivityTracker: jest.Mocked<ActivityTracker>;

  const chainId = 1;
  const EIP1559SupportedNetworks = [1, 137];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock cache service
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

    // Setup mock network service
    mockNetworkService = {
      getEIP1559FeesPerGas: jest.fn().mockResolvedValue({
        maxFeePerGas: BigInt("20000000000"),
        maxPriorityFeePerGas: BigInt("1000000000"),
      }),
      getLegacyGasPrice: jest.fn().mockResolvedValue("10000000000"),
      supportsBlockNative: false,
    } as unknown as jest.Mocked<
      INetworkService<IEVMAccount, EVMRawTransactionType>
    >;

    // Setup mock activity tracker
    mockActivityTracker = {
      recordActivity: jest.fn().mockResolvedValue(undefined),
      getActivityLevel: jest.fn().mockResolvedValue(0),
      getRecommendedInterval: jest.fn().mockResolvedValue(15000),
    } as unknown as jest.Mocked<ActivityTracker>;

    // Create service instance
    gasPriceService = new GasPriceService(
      mockCacheService,
      mockNetworkService,
      {
        chainId,
        EIP1559SupportedNetworks,
      },
    );

    // Replace activity tracker with mock
    Object.defineProperty(gasPriceService, "activityTracker", {
      value: mockActivityTracker,
      writable: true,
    });
  });

  describe("getGasPrice", () => {
    it("should record activity when getting gas price", async () => {
      await gasPriceService.getGasPrice();
      expect(mockActivityTracker.recordActivity).toHaveBeenCalledWith(chainId);
    });

    describe("EIP-1559 networks", () => {
      it("should return cached EIP-1559 gas prices when available", async () => {
        // Mock cache to return EIP-1559 gas prices
        mockCacheService.get
          .mockResolvedValueOnce("20000000000") // maxFeePerGas
          .mockResolvedValueOnce("1000000000"); // maxPriorityFeePerGas

        const result = await gasPriceService.getGasPrice();

        expect(result).toEqual({
          maxFeePerGas: BigInt("20000000000"),
          maxPriorityFeePerGas: BigInt("1000000000"),
        });
        expect(mockNetworkService.getEIP1559FeesPerGas).not.toHaveBeenCalled();
      });

      it("should fetch from network when cache is empty", async () => {
        const result = await gasPriceService.getGasPrice();

        expect(result).toEqual({
          maxFeePerGas: BigInt("20000000000"),
          maxPriorityFeePerGas: BigInt("1000000000"),
        });
        expect(mockNetworkService.getEIP1559FeesPerGas).toHaveBeenCalled();
      });

      it("should enforce minimum priority fee for Polygon", async () => {
        // Create service for Polygon
        const polygonService = new GasPriceService(
          mockCacheService,
          mockNetworkService,
          {
            chainId: 137,
            EIP1559SupportedNetworks,
          },
        );
        Object.defineProperty(polygonService, "activityTracker", {
          value: mockActivityTracker,
          writable: true,
        });

        const result = await polygonService.getGasPrice();
        if (typeof result === "object" && "maxPriorityFeePerGas" in result) {
          expect(result.maxPriorityFeePerGas).toBe(BigInt("30000000000"));
        } else {
          throw new Error("Expected EIP-1559 gas price result");
        }
      });
    });

    describe("Legacy networks", () => {
      it("should return cached legacy gas price when available", async () => {
        // Create service for non-EIP-1559 network
        const legacyService = new GasPriceService(
          mockCacheService,
          mockNetworkService,
          {
            chainId: 56, // BSC
            EIP1559SupportedNetworks,
          },
        );
        Object.defineProperty(legacyService, "activityTracker", {
          value: mockActivityTracker,
          writable: true,
        });

        // Mock cache to return legacy gas price
        mockCacheService.get.mockResolvedValueOnce("10000000000");

        const result = await legacyService.getGasPrice();

        expect(result).toBe(BigInt("10000000000"));
        expect(mockNetworkService.getLegacyGasPrice).not.toHaveBeenCalled();
      });

      it("should fetch from network when cache is empty", async () => {
        // Create service for non-EIP-1559 network
        const legacyService = new GasPriceService(
          mockCacheService,
          mockNetworkService,
          {
            chainId: 56, // BSC
            EIP1559SupportedNetworks,
          },
        );
        Object.defineProperty(legacyService, "activityTracker", {
          value: mockActivityTracker,
          writable: true,
        });

        const result = await legacyService.getGasPrice();

        expect(result).toBe(BigInt("10000000000"));
        expect(mockNetworkService.getLegacyGasPrice).toHaveBeenCalled();
      });
    });
  });

  describe("getBumpedUpGasPrice", () => {
    it("should bump EIP-1559 gas prices correctly", async () => {
      const pastGasPrice = {
        maxFeePerGas: BigInt("20000000000"),
        maxPriorityFeePerGas: BigInt("1000000000"),
      };

      const result = await gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        10,
      );

      expect(result).toEqual({
        maxFeePerGas: BigInt("22000000000"),
        maxPriorityFeePerGas: BigInt("1100000000"),
      });
    });

    it("should bump legacy gas prices correctly", async () => {
      const pastGasPrice = BigInt("10000000000");

      const result = await gasPriceService.getBumpedUpGasPrice(
        pastGasPrice,
        10,
      );

      expect(result).toBe(BigInt("11000000000"));
    });
  });

  describe("cache operations", () => {
    it("should set gas price in cache", async () => {
      await gasPriceService.setGasPrice(GasPriceType.DEFAULT, "10000000000");
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `GasFee_${chainId}_DEFAULT`,
        "10000000000",
      );
    });

    it("should set max fee per gas in cache", async () => {
      await gasPriceService.setMaxFeeGasPrice(
        GasPriceType.DEFAULT,
        "20000000000",
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `MaxFeePerGas_${chainId}_DEFAULT`,
        "20000000000",
      );
    });

    it("should set max priority fee per gas in cache", async () => {
      await gasPriceService.setMaxPriorityFeeGasPrice(
        GasPriceType.DEFAULT,
        "1000000000",
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `MaxPriorityFeePerGas_${chainId}_DEFAULT`,
        "1000000000",
      );
    });

    it("should set base fee per gas in cache", async () => {
      await gasPriceService.setBaseFeePerGas("10000000000");
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `BaseFeePerGas_${chainId}`,
        "10000000000",
      );
    });
  });
});
