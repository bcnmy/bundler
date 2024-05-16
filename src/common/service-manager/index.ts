/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { getContract } from "viem";
import { ENTRY_POINT_ABI } from "entry-point-gas-estimations";
import { config } from "../config";
import { EVMNonceManager } from "../../node/nonce-manager";
import { EVMRelayerManager } from "../../node/relayer-manager";
import { EVMRelayerQueue } from "../../node/relayer-queue";
import { EVMTransactionListener } from "../../node/transaction-listener";
import { EVMTransactionService } from "../../node/transaction-service";
import { RedisCacheService } from "../cache";
import { Mongo } from "../db";
import { UserOperationDAO } from "../db/dao/UserOperationDAO";
import { logger } from "../logger";
import { NotificationManager } from "../notification";
import { SlackNotificationService } from "../notification/slack/SlackNotificationService";
import { EntryPointContractType, EntryPointMap } from "../types";
import { UserOperationStateDAO } from "../db/dao/UserOperationStateDAO";
import { customJSONStringify, parseError } from "../utils";
import { GasPriceService } from "../gas-price";
import { CacheFeesJob } from "../gas-price/jobs/CacheFees";
import { BundlerSimulationService } from "../../node/simulation";
import { EVMNetworkService } from "../../node/network";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const gasPriceServiceMap: {
  [chainId: number]: GasPriceService;
} = {};

const bundlerSimulationServiceMap: {
  [chainId: number]: BundlerSimulationService;
} = {};

const entryPointMap: EntryPointMap = {};

const dbInstance = Mongo.getInstance();
const cacheService = RedisCacheService.getInstance();

const { supportedNetworks } = config;

const userOperationDao = new UserOperationDAO();
const userOperationStateDao = new UserOperationStateDAO();

/**
 * Method setups up all services that are either injected
 * into other services or are mapped to chainId
 * @returns {void}
 */
export const setupServiceManager = async (): Promise<void> => {
  // connect to db instance
  await dbInstance.connect();

  // connect to redis cache instance
  await cacheService.connect();

  // create the slack notification service
  const slackNotificationService = new SlackNotificationService(
    config.slack.token,
    config.slack.channel,
  );
  // pass in the slack notification service to notification manager
  const notificationManager = new NotificationManager(slackNotificationService);

  log.info(
    `Setting up instances for following chainIds: ${customJSONStringify(
      supportedNetworks,
    )}`,
  );

  for (const chainId of supportedNetworks) {
    log.info(`Setup of services started for chainId: ${chainId}`);
    entryPointMap[chainId] = [];

    log.info(`Setting up network service for chainId: ${chainId}`);
    const networkService = new EVMNetworkService({
      chainId,
    });
    log.info(`Network service setup complete for chainId: ${chainId}`);

    log.info(`Setting up gas price manager for chainId: ${chainId}`);
    const gasPriceService = new GasPriceService(cacheService, networkService, {
      chainId,
    });
    log.info(`Gas price service setup complete for chainId: ${chainId}`);

    // node path index is a unique index for every node we run
    // it useful to create unique relayer addresses for a given node
    // We have to make sure that cachin services should run on only one node
    // as they populate the shared redis cache

    // added check for relayer node path in order to run on only one server
    if (gasPriceService && config.relayer.nodePathIndex === 0) {
      const gasPriceSchedule = `*/${config.chains.updateFrequencyInSeconds[chainId]} * * * * *`;
      log.info(
        `Scheduling CacheFeesJob for chainId: ${chainId} with schedule: '${gasPriceSchedule}'`,
      );
      try {
        const cacheFeesJob = new CacheFeesJob(
          gasPriceSchedule,
          gasPriceService,
        );
        cacheFeesJob.start();
      } catch (err) {
        log.error(
          `Error in scheduling gas price job for chainId: ${chainId} and schedule: ${gasPriceSchedule}: ${parseError(
            err,
          )}`,
        );
      }
    }
    if (!gasPriceService) {
      throw new Error(`Gasprice service is not setup for chainId ${chainId}`);
    }
    gasPriceServiceMap[chainId] = gasPriceService;
    log.info(`Gas price service setup complete for chainId: ${chainId}`);

    log.info(`Setting up nonce manager for chainId: ${chainId}`);
    const { nonceExpiryTTL } = config;
    const nonceManager = new EVMNonceManager({
      options: {
        nonceExpiryTTL,
      },
      networkService,
      cacheService,
    });
    log.info(`Nonce manager setup complete for chainId: ${chainId}`);

    log.info(`Setting up transaction listener for chainId: ${chainId}`);
    const transactionListener = new EVMTransactionListener({
      networkService,
      cacheService,
      userOperationDao,
      userOperationStateDao,
      options: {
        entryPointMap,
      },
    });
    log.info(`Transaction listener setup complete for chainId: ${chainId}`);

    log.info(`Setting up transaction service for chainId: ${chainId}`);
    const transactionService = new EVMTransactionService({
      networkService,
      transactionListener,
      nonceManager,
      gasPriceService,
      cacheService,
      notificationManager,
      userOperationStateDao,
    });
    log.info(`Transaction service setup complete for chainId: ${chainId}`);

    log.info(`Setting up relayer manager for chainId: ${chainId}`);
    const relayerQueue = new EVMRelayerQueue([]);

    const relayerMangerInstance = new EVMRelayerManager({
      networkService,
      gasPriceService,
      cacheService,
      transactionService,
      nonceManager,
      relayerQueue,
      notificationManager,
    });

    const addressList = await relayerMangerInstance.createRelayers();
    log.info(
      `Relayer address list length: ${
        addressList.length
      } and minRelayerCount: ${customJSONStringify(
        config.relayerManager.minRelayerCount,
      )}`,
    );
    await relayerMangerInstance.fundRelayers(addressList);
    log.info(`Relayer manager setup complete for chainId: ${chainId}`);

    log.info(`Relayer manager setup complete for chainId: ${chainId}`);

    bundlerSimulationServiceMap[chainId] = new BundlerSimulationService(
      networkService,
      gasPriceService,
    );

    const { entryPointData } = config;

    for (const [
      entryPointAddress,
      entryPointSupportedChainIdsAndAbi,
    ] of Object.entries(entryPointData)) {
      if (
        entryPointSupportedChainIdsAndAbi.supportedChainIds.includes(chainId)
      ) {
        entryPointMap[chainId].push({
          address: entryPointAddress,
          entryPointContract: getContract({
            abi: ENTRY_POINT_ABI,
            address: entryPointAddress as `0x${string}`,
            client: {
              public: networkService.publicClient,
            },
          }),
        });
      }
    }
  }
  log.info("<=== Config setup completed ===>");
};

export const getUserOperationDao = (): UserOperationDAO => userOperationDao;

export const getUserOpertionStateDao = (): UserOperationStateDAO =>
  userOperationStateDao;

export const getEntryPointMap = (chainId: number): {
  address: string;
  entryPointContract: EntryPointContractType;
}[] => entryPointMap[chainId];

export const getGasPriceServiceMap = (chainId: number): GasPriceService =>
  gasPriceServiceMap[chainId];

export const getBundlerSimulationServiceMap = (
  chainId: number,
): BundlerSimulationService => bundlerSimulationServiceMap[chainId];
