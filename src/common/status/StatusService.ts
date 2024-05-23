/* eslint-disable import/no-import-module-exports */
import { parseEther } from "viem/utils";
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
import { BundlerSimulationService } from "../simulation";
import { formatHrtimeSeconds } from "../utils/formatting";

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

  constructor(params: StatusServiceParamsType) {
    const {
      cacheService,
      networkServiceMap,
      evmRelayerManagerMap,
      dbInstance,
      gasPriceServiceMap,
      bundlerSimulationServiceMap,
    } = params;
    this.cacheService = cacheService;
    this.networkServiceMap = networkServiceMap;
    this.evmRelayerManagerMap = evmRelayerManagerMap;
    this.dbInstance = dbInstance;
    this.gasPriceServiceMap = gasPriceServiceMap;
    this.bundlerSimulationServiceMap = bundlerSimulationServiceMap;
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

    // 💡 This could be parallelized with Promise.all, but I decided not to do it.
    // We are doing a lot of calls like this one in our regular user flows (e.g. eth_estimateUserOperationGas, eth_sendUserOperation)
    // without much parallelization, so I want this check to behave similarly so we can spot latency issues
    try {
      const redisHealth = await this.checkRedis();
      errors = errors.concat(redisHealth.errors);
      latencies.redis = redisHealth.durationSeconds;

      const rpcHealth = await this.checkRPC(chainId);
      errors = errors.concat(rpcHealth.errors);
      latencies.rpc = rpcHealth.durationSeconds;

      const gasPriceHealth = await this.checkGasPrice(chainId);
      errors = errors.concat(gasPriceHealth.errors);
      latencies.gasPrice = gasPriceHealth.durationSeconds;

      const simulatorHealth = await this.checkSimulator(chainId);
      errors = errors.concat(simulatorHealth.errors);
      latencies.simulator = simulatorHealth.durationSeconds;

      const relayersHealth = await this.checkRelayers(chainId);
      errors = errors.concat(relayersHealth.errors);
      latencies.relayers = relayersHealth.durationSeconds;
    } catch (err: any) {
      log.error(`Error in checkChain: ${customJSONStringify(err)}`);
      healthy = false;
      errors.push(err.message);
    }

    latencies.total = formatHrtimeSeconds(process.hrtime(start));

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

        if (!gasPrice.maxPriorityFeePerGas) {
          throw new Error(
            `Could not fetch maxPriorityFeePerGas for chainId: ${chainId}`,
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
      // eslint-disable-next-line @typescript-eslint/dot-notation
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

        // this value is in ETH and we need to convert it to wei.
        // This is confusing because the fundingBalanceThreshold is already parsed to wei
        const fundingRelayerAmount = parseEther(
          relayerManager.fundingRelayerAmount.toString(),
        );

        if (
          relayer.balance < relayerManager.fundingBalanceThreshold &&
          masterAccountBalance < fundingRelayerAmount
        ) {
          throw new Error(`Relayers for chainId: ${chainId} have low balance`);
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
  async info(): Promise<StatusInfo> {
    const statusInfo: StatusInfo = {};

    // eslint-disable-next-line @typescript-eslint/dot-notation
    const relayerManagers = this.evmRelayerManagerMap["RM1"];
    if (!relayerManagers) {
      throw new Error(`Relayers are temporarily unavailable`);
    }

    for (const [chainId, relayerManager] of Object.entries(relayerManagers)) {
      const chainIdInt = parseInt(chainId, 10);
      statusInfo[chainIdInt] = {
        relayers: [],
      };

      for (const address of Object.keys(relayerManager.relayerMap)) {
        const relayer =
          relayerManager.relayerQueue.get(address) ||
          relayerManager.transactionProcessingRelayerMap[address];

        statusInfo[chainIdInt].relayers.push(relayer);
      }
    }

    return statusInfo;
  }
}
