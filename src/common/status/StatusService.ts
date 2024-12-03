/* eslint-disable @typescript-eslint/no-explicit-any */
import nodeconfig from "config";
import { IEVMAccount } from "../../relayer/account";
import { IRelayerManager } from "../../relayer/relayer-manager";
import { ICacheService } from "../cache";
import { IDBService } from "../db";
import { EVMNetworkService } from "../network";
import { ChainStatus, EVMRawTransactionType, StatusInfo } from "../types";
import { customJSONStringify } from "../utils";
import { IStatusService } from "./interface/IStatusService";
import { logger } from "../logger";
import { StatusServiceParamsType } from "./types";
import { GasPriceService } from "../gas-price";
import {
  BundlerSimulationService,
  BundlerSimulationServiceV07,
} from "../simulation";
import { formatHrtimeSeconds } from "../utils/timing";

const filenameLogger = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

type StatusCheckResult = {
  errors: string[];
  durationSeconds: number;
};

// statusCheck is a helper function that runs a check function and returns the result,
//  measuring the time it took to run the check.
async function statusCheck(
  checkFunc: () => Promise<void>,
): Promise<StatusCheckResult> {
  const errors: string[] = [];
  const start = process.hrtime();

  try {
    await checkFunc();
  } catch (err: any) {
    errors.push(err.message);
  }

  const end = process.hrtime(start);
  return {
    errors,
    durationSeconds: formatHrtimeSeconds(end),
  };
}

export class StatusService implements IStatusService {
  cacheService: ICacheService;

  networkServiceMap: Record<number, EVMNetworkService>;

  dbInstance: IDBService;

  evmRelayerManagerMap: {
    [name: string]: {
      [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
    };
  } = {};

  gasPriceServiceMap: {
    [chainId: number]: GasPriceService;
  };

  bundlerSimulationServiceMap: {
    [chainId: number]: BundlerSimulationService;
  };

  bundlerSimulationServiceMapV07: {
    [chainId: number]: BundlerSimulationServiceV07;
  };

  constructor(params: StatusServiceParamsType) {
    const {
      cacheService,
      networkServiceMap,
      evmRelayerManagerMap,
      dbInstance,
      gasPriceServiceMap,
      bundlerSimulationServiceMap,
      bundlerSimulationServiceMapV07,
    } = params;
    this.cacheService = cacheService;
    this.networkServiceMap = networkServiceMap;
    this.evmRelayerManagerMap = evmRelayerManagerMap;
    this.dbInstance = dbInstance;
    this.gasPriceServiceMap = gasPriceServiceMap;
    this.bundlerSimulationServiceMap = bundlerSimulationServiceMap;
    this.bundlerSimulationServiceMapV07 = bundlerSimulationServiceMapV07;
  }

  async checkAllChains(): Promise<ChainStatus[]> {
    const supportedNetworks = nodeconfig.get<number[]>("supportedNetworks");

    const promises = supportedNetworks.map((chainId) =>
      this.checkChain(chainId),
    );

    return Promise.all(promises);
  }

  // checkChain is a function that checks the health of a specific chain.
  // It checks the health of the individual components that are required to estimate gas & relay transactions
  async checkChain(chainId: number): Promise<ChainStatus> {
    let healthy = true;
    let errors: string[] = [];
    const latencies: any = {};

    const log = filenameLogger.child({
      chainId,
    });

    const start = process.hrtime();

    // Run all checks in parallel with Promise.all
    try {
      const promises = [];

      promises.push(
        new Promise((resolve, reject) => {
          this.checkRedis()
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.redis = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      promises.push(
        new Promise((resolve, reject) => {
          this.checkMongo()
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.mongo = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      promises.push(
        new Promise((resolve, reject) => {
          this.checkRPC(chainId)
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.rpc = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      promises.push(
        new Promise((resolve, reject) => {
          this.checkGasPrice(chainId)
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.gasPrice = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      promises.push(
        new Promise((resolve, reject) => {
          this.checkSimulator(chainId)
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.simulator = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      // TODO: Add a config flag to disable checking relayers
      promises.push(
        new Promise((resolve, reject) => {
          this.checkRelayers(chainId)
            .then((res) => {
              errors = errors.concat(res.errors);
              latencies.relayers = res.durationSeconds;
              resolve(res);
            })
            .catch((err) => reject(err));
        }),
      );

      await Promise.all(promises);
    } catch (err: any) {
      log.error(`Error in checkChain: ${customJSONStringify(err)}`);
      healthy = false;
      errors.push(err.message);
    }

    latencies.total = formatHrtimeSeconds(process.hrtime(start));
    healthy = errors.length === 0;

    return {
      chainId,
      healthy,
      errors,
      latencies,
    };
  }

  // checkRPC checks if the RPC connection for this chain is healthy and if it's connected to the right chain
  async checkRPC(chainId: number): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      const networkService = this.networkServiceMap[chainId];
      if (!networkService) {
        throw new Error("RPC connection temporarily unavailable");
      }

      const networkChainId = await networkService.getChainId();
      if (networkChainId !== chainId) {
        throw new Error(
          `Bad RPC connection: chainId mismatch. Expected ${chainId}, got ${networkChainId}`,
        );
      }
    });
  }

  // checkGasPrice checks if we have cached the gas price for this chain
  async checkGasPrice(chainId: number): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      const gasPriceService = this.gasPriceServiceMap[chainId];
      if (!gasPriceService) {
        throw new Error(
          `Gas price is temporarily unavailable for chainId: ${chainId}`,
        );
      }

      const gasPrice = await gasPriceService.getGasPrice();
      if (typeof gasPrice !== "bigint") {
        if (!gasPrice.maxFeePerGas) {
          throw new Error(
            `Could not fetch maxFeePerGas for chainId: ${chainId}`,
          );
        }
      } else if (!gasPrice) {
        throw new Error(`Could not fetch gasPrice for chainId: ${chainId}`);
      }
    });
  }

  // checkRelayers (tries to) check if the relayers can actually relay transactions
  async checkRelayers(chainId: number): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      const relayerManager = this.evmRelayerManagerMap["RM1"][chainId];
      if (!relayerManager) {
        throw new Error(
          `Relayers are temporarily unavailable for chainId: ${chainId}`,
        );
      }

      // A basic sanity check: this will be 0 if and only if it was never funded.
      // Even if it was funded and then drained, the balance will be non-zero.
      const masterAccount = relayerManager.ownerAccountDetails.getPublicKey();
      const masterAccountBalance =
        await this.networkServiceMap[chainId].getBalance(masterAccount);

      if (masterAccountBalance === 0n) {
        throw new Error(`Relayer for chainId: ${chainId} is not funded`);
      }

      // The following checks if the relayers are low on balance and returns an error only if the master account is also low on balance
      for (const address of Object.keys(relayerManager.relayerMap)) {
        const relayer =
          relayerManager.relayerQueue.get(address) ||
          relayerManager.transactionProcessingRelayerMap[address];

        const epsilonWei = 10; // a tiny amount greater than zero
        if (relayer.balance < epsilonWei) {
          throw new Error(
            `Relayer with address: ${relayer.address} for chainId: ${chainId} is not funded`,
          );
        }
      }
    });
  }

  // checkSimulator checks if the simulation service is available for this chain
  async checkSimulator(chainId: number): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      const simulator = this.bundlerSimulationServiceMap[chainId];
      if (!simulator) {
        throw new Error(
          `Simulation service temporarily unavailable for chainId: ${chainId}`,
        );
      }
    });
  }

  // checkRedis checks if we can set & get from the cache
  async checkRedis(): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      await this.cacheService.set("health", "ok");
      const result = await this.cacheService.get("health");
      if (result !== "ok") {
        throw new Error("Redis is not working as expected");
      }
    });
  }

  // checkMongo checks if we are connected to the database
  async checkMongo(): Promise<StatusCheckResult> {
    return statusCheck(async () => {
      if (!this.dbInstance.isConnected()) {
        throw new Error("Not connected to the database");
      }
    });
  }

  // info returns some basic information about the service.
  // Currently it returns just info about the relayers, but it can easily be extended to return other data also.
  // TODO: Ideas for stuff to add to the info response:
  // - master account address and balance
  // - relayer queues sizes
  // - bundler version information (we need to fetch this from git somehow)
  // - RPC provider information (without leaking keys, basically just the provider name)
  async info(chainId: number): Promise<StatusInfo> {
    const statusInfo: StatusInfo = {};

    const relayerManagers = this.evmRelayerManagerMap["RM1"];
    if (!relayerManagers) {
      throw new Error(`Relayers are temporarily unavailable`);
    }

    const relayerManager = relayerManagers[chainId];
    const relayers = Object.values(relayerManager.relayerMap);

    statusInfo[chainId] = {
      relayers: await Promise.all(relayers.map((relayer) => relayer.getInfo())),
    };

    return statusInfo;
  }
}
