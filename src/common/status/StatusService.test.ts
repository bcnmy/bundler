import { EVMNetworkService } from "../network";
import { NetworkBasedGasPriceType } from "../types";
import { StatusService } from "./StatusService";

describe("StatusService", () => {
  const chainId = 137;

  describe("checkRPC", () => {
    it("should return no errors if RPC returns the correct chain ID", async () => {
      const statusService = new StatusService({
        // we mock the network service because it's used in this test
        networkServiceMap: {
          137: {
            getChainId: (): Promise<number> => Promise.resolve(chainId),
          } as EVMNetworkService,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkRPC(chainId);

      expect(errors).toEqual([]);
      expect(durationSeconds).toBeGreaterThan(0);
    });

    it("should return an error if the RPC client throws an error", async () => {
      const rpcError = new Error("RPC error");

      const statusService = new StatusService({
        // we mock the network service because it's used in this test
        networkServiceMap: {
          137: {
            getChainId: (): Promise<number> => Promise.reject(rpcError),
          } as EVMNetworkService,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkRPC(chainId);
      expect(errors).toEqual([rpcError.message]);
      expect(durationSeconds).toBeGreaterThan(0);
    });
  });

  describe("checkGasPrice", () => {
    it("should return no errors if the gas price service returns a value", async () => {
      const statusService = new StatusService({
        // we mock the gas price service because it's used in this test
        gasPriceServiceMap: {
          137: {
            getGasPrice: (): Promise<NetworkBasedGasPriceType> =>
              Promise.resolve(1000n),
          } as unknown as EVMNetworkService,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        networkServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } =
        await statusService.checkGasPrice(chainId);

      expect(errors).toEqual([]);
      expect(durationSeconds).toBeGreaterThan(0);
    });

    it("should return an error if the gas price service throws an error", async () => {
      const gasPriceError = new Error("Gas price error");

      const statusService = new StatusService({
        // we mock the gas price service because it's used in this test
        gasPriceServiceMap: {
          137: {
            getGasPrice: (): Promise<NetworkBasedGasPriceType> =>
              Promise.reject(gasPriceError),
          } as unknown as EVMNetworkService,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        networkServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } =
        await statusService.checkGasPrice(chainId);

      expect(errors).toEqual([gasPriceError.message]);
      expect(durationSeconds).toBeGreaterThan(0);
    });
  });

  describe("checkRelayers", () => {
    it("should return no errors if relayers are healthy", async () => {
      // we mock only the services that are used
      const statusService = new StatusService({
        evmRelayerManagerMap: {
          RM1: {
            137: {
              ownerAccountDetails: {
                getPublicKey: () => "0x123",
              },
              relayerMap: {},
            } as any,
          },
        },
        networkServiceMap: {
          137: {
            getBalance: () => Promise.resolve(1000n),
          },
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        dbInstance: {} as any,
        bundlerSimulationServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
      });

      const { durationSeconds, errors } =
        await statusService.checkRelayers(chainId);

      expect(errors).toEqual([]);
      expect(durationSeconds).toBeGreaterThan(0);
    });

    it("should return an error if the master account was never funded", async () => {
      // we mock only the services that are used
      const statusService = new StatusService({
        evmRelayerManagerMap: {
          RM1: {
            137: {
              ownerAccountDetails: {
                getPublicKey: () => "0x123",
              },
              relayerMap: {},
            } as any,
          },
        },
        networkServiceMap: {
          137: {
            getBalance: () => Promise.resolve(0n),
          },
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        cacheService: {} as any,
        dbInstance: {} as any,
        bundlerSimulationServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
      });

      const { durationSeconds, errors } =
        await statusService.checkRelayers(chainId);

      expect(errors).toEqual([`Relayer for chainId: ${chainId} is not funded`]);
      expect(durationSeconds).toBeGreaterThan(0);
    });
  });

  describe("checkRedis", () => {
    it("should return no errors if we can set & get from the cache", async () => {
      const statusService = new StatusService({
        cacheService: {
          set: () => Promise.resolve(),
          get: () => Promise.resolve("ok"),
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        networkServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkRedis();

      expect(errors).toEqual([]);
      expect(durationSeconds).toBeGreaterThan(0);
    });

    it("should return an error if the cache service throws an error", async () => {
      const cacheError = new Error("Cache error");

      const statusService = new StatusService({
        cacheService: {
          set: () => Promise.reject(cacheError),
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        evmRelayerManagerMap: {} as any,
        dbInstance: {} as any,
        networkServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkRedis();

      expect(errors).toEqual([cacheError.message]);
      expect(durationSeconds).toBeGreaterThan(0);
    });
  });

  describe("checkMongo", () => {
    it("should return no errors if we are connected to the database", async () => {
      const statusService = new StatusService({
        dbInstance: {
          isConnected: () => true,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        evmRelayerManagerMap: {} as any,
        cacheService: {} as any,
        networkServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkMongo();

      expect(errors).toEqual([]);
      expect(durationSeconds).toBeGreaterThan(0);
    });

    it("should return an error if we are not connected to the database", async () => {
      const statusService = new StatusService({
        dbInstance: {
          isConnected: () => false,
        } as any,
        // we won't use the following services in this test, so we can just pass empty objects
        evmRelayerManagerMap: {} as any,
        cacheService: {} as any,
        networkServiceMap: {} as any,
        gasPriceServiceMap: {} as any,
        bundlerSimulationServiceMap: {} as any,
      });

      const { durationSeconds, errors } = await statusService.checkMongo();

      expect(errors).toEqual(["Not connected to the database"]);
      expect(durationSeconds).toBeGreaterThan(0);
    });
  });
});
