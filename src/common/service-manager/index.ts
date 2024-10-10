/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { getContract, parseEther } from "viem";
import { chain } from "lodash";
import { ENTRY_POINT_ABI } from "entry-point-gas-estimations/dist/gas-estimator/entry-point-v6";
import { config } from "../../config";
import { EVMAccount, IEVMAccount } from "../../relayer/account";
import { BundlerConsumer } from "../../relayer/consumer";
import { EVMNonceManager } from "../../relayer/nonce-manager";
import {
  EVMRelayerManager,
  IRelayerManager,
} from "../../relayer/relayer-manager";
import { EVMRelayerQueue } from "../../relayer/relayer-queue";
import { EVMRetryTransactionService } from "../../relayer/retry-transaction-service";
import { EVMTransactionListener } from "../../relayer/transaction-listener";
import { EVMTransactionService } from "../../relayer/transaction-service";
import { RedisCacheService } from "../cache";
import { Mongo, TransactionDAO } from "../db";
import { UserOperationDAO } from "../db/dao/UserOperationDAO";
import { UserOperationV07DAO } from "../db/dao/UserOperationV07DAO";
import { IQueue } from "../interface";
import { logger } from "../logger";
import { relayerManagerTransactionTypeNameMap } from "../maps";
import { EVMNetworkService } from "../network";
import { NotificationManager } from "../notification";
import { SlackNotificationService } from "../notification/slack/SlackNotificationService";
import {
  BundlerTransactionQueue,
  RetryTransactionHandlerQueue,
} from "../queue";
import { BundlerRelayService } from "../relay-service";
import {
  BundlerSimulationService,
  BundlerSimulationServiceV07,
} from "../simulation";
import { IStatusService, StatusService } from "../status";
import {
  BundlerTransactionMessageType,
  EntryPointMapType,
  EntryPointV07MapType,
  EVMRawTransactionType,
  TransactionType,
} from "../types";
import { UserOperationStateDAO } from "../db/dao/UserOperationStateDAO";
import { customJSONStringify, parseError } from "../utils";
import { GasPriceService } from "../gas-price";
import { CacheFeesJob } from "../gas-price/jobs/CacheFees";
import { ENTRY_POINT_V07_ABI } from "../entrypoint-v7/abiv7";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [transactionType: string]: BundlerRelayService;
  };
} = {};

const gasPriceServiceMap: {
  [chainId: number]: GasPriceService;
} = {};

const bundlerSimulationServiceMap: {
  [chainId: number]: BundlerSimulationService;
} = {};

const bundlerSimulationServiceMapV07: {
  [chainId: number]: BundlerSimulationServiceV07;
} = {};

const entryPointMap: EntryPointMapType = {};
const entryPointMapV07: EntryPointV07MapType = {};

const dbInstance = Mongo.getInstance();
const cacheService = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

const EVMRelayerManagerMap: {
  [name: string]: {
    [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
  };
} = {};

const transactionDao = new TransactionDAO();
const userOperationDao = new UserOperationDAO();
const userOperationV07Dao = new UserOperationV07DAO();

const userOperationStateDao = new UserOperationStateDAO();

const retryTransactionServiceMap: Record<number, EVMRetryTransactionService> =
  {};
const transactionServiceMap: Record<number, EVMTransactionService> = {};
const transactionListenerMap: Record<number, EVMTransactionListener> = {};
const retryTransactionQueueMap: {
  [key: number]: RetryTransactionHandlerQueue;
} = {};
const networkServiceMap: Record<number, EVMNetworkService> = {};

// eslint-disable-next-line import/no-mutable-exports
let statusService: IStatusService;

(async () => {
  await dbInstance.connect();
  await cacheService.connect();

  const slackNotificationService = new SlackNotificationService(
    process.env.BUNDLER_SLACK_TOKEN || config.slack.token,
    process.env.BUNDLER_SLACK_CHANNEL || config.slack.channel,
  );
  const notificationManager = new NotificationManager(slackNotificationService);

  log.info(
    `Setting up instances for following chainIds: ${customJSONStringify(
      supportedNetworks,
    )}`,
  );

  log.info(`Supported networks are: ${supportedNetworks}`);
  for (const chainId of supportedNetworks) {
    log.info(`Setup of services started for chainId: ${chainId}`);
    routeTransactionToRelayerMap[chainId] = {};
    entryPointMap[chainId] = [];
    entryPointMapV07[chainId] = [];

    if (!config.chains.providers || !config.chains.providers[chainId]) {
      throw new Error(`No providers in config for chainId: ${chainId}`);
    }

    const [firstProvider] = config.chains.providers[chainId];
    const rpcUrl = firstProvider.url;

    log.info(`Setting up network service for chainId: ${chainId}`);
    const networkService = new EVMNetworkService({
      chainId,
      rpcUrl,
    });
    log.info(`Network service setup complete for chainId: ${chainId}`);
    networkServiceMap[chainId] = networkService;

    log.info(`Setting up gas price manager for chainId: ${chainId}`);
    const gasPriceService = new GasPriceService(cacheService, networkService, {
      chainId,
      EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
    });
    log.info(`Gas price service setup complete for chainId: ${chainId}`);

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
          `Error in scheduling gas price job for chainId: ${chain} and schedule: ${gasPriceSchedule}: ${parseError(
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

    log.info(`Setting up retry transaction queue for chainId: ${chainId}`);
    const retryTransactionQueue = new RetryTransactionHandlerQueue({
      chainId,
      nodePathIndex: config.relayer.nodePathIndex,
    });
    retryTransactionQueueMap[chainId] = retryTransactionQueue;
    await retryTransactionQueueMap[chainId].connect();
    log.info(`Retry transaction queue setup complete for chainId: ${chainId}`);

    log.info(`Setting up nonce manager for chainId: ${chainId}`);
    const nonceExpiryTTL = 3600;
    const nonceManager = new EVMNonceManager({
      options: {
        chainId,
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
      retryTransactionQueue,
      transactionDao,
      userOperationDao,
      userOperationDaoV07: userOperationV07Dao,
      userOperationStateDao,
      options: {
        chainId,
        entryPointMap,
        entryPointMapV07,
      },
    });
    transactionListenerMap[chainId] = transactionListener;
    log.info(`Transaction listener setup complete for chainId: ${chainId}`);

    log.info(`Setting up transaction service for chainId: ${chainId}`);
    const transactionService = new EVMTransactionService({
      networkService,
      transactionListener,
      nonceManager,
      gasPriceService,
      transactionDao,
      cacheService,
      notificationManager,
      userOperationStateDao,
      options: {
        chainId,
      },
    });
    transactionServiceMap[chainId] = transactionService;
    log.info(`Transaction service setup complete for chainId: ${chainId}`);

    log.info(`Setting up relayer manager for chainId: ${chainId}`);
    for (const relayerManager of config.relayerManagers) {
      const relayerQueue = new EVMRelayerQueue([]);
      if (!EVMRelayerManagerMap[relayerManager.name]) {
        EVMRelayerManagerMap[relayerManager.name] = {};
      }

      const relayerMangerInstance = new EVMRelayerManager({
        networkService,
        gasPriceService,
        cacheService,
        transactionService,
        nonceManager,
        relayerQueue,
        notificationManager,
        options: {
          chainId,
          name: relayerManager.name,
          relayerSeed: relayerManager.relayerSeed,
          minRelayerCount: relayerManager.minRelayerCount[chainId],
          maxRelayerCount: relayerManager.maxRelayerCount[chainId],
          inactiveRelayerCountThreshold:
            relayerManager.inactiveRelayerCountThreshold[chainId],
          pendingTransactionCountThreshold:
            relayerManager.pendingTransactionCountThreshold[chainId],
          newRelayerInstanceCount:
            relayerManager.newRelayerInstanceCount[chainId],
          fundingBalanceThreshold: parseEther(
            relayerManager.fundingBalanceThreshold[chainId].toString(),
          ),
          fundingRelayerAmount: relayerManager.fundingRelayerAmount[chainId],
          ownerAccountDetails: new EVMAccount(
            relayerManager.ownerAddress,
            relayerManager.ownerPrivateKey,
            networkService.rpcUrl,
          ),
          gasLimitMap: relayerManager.gasLimitMap,
        },
      });
      EVMRelayerManagerMap[relayerManager.name][chainId] =
        relayerMangerInstance;

      const addressList = await relayerMangerInstance.createRelayers();
      log.info(
        `Relayer address list length: ${
          addressList.length
        } and minRelayerCount: ${customJSONStringify(
          relayerManager.minRelayerCount,
        )} for relayerManager: ${relayerManager.name}`,
      );
      await relayerMangerInstance.fundRelayers(addressList);
      log.info(
        `Relayer manager setup complete for chainId: ${chainId} for relayerManager: ${relayerManager.name}`,
      );
    }

    log.info(`Relayer manager setup complete for chainId: ${chainId}`);

    log.info(`Setting up retry transaction service for chainId: ${chainId}`);
    retryTransactionServiceMap[chainId] = new EVMRetryTransactionService({
      retryTransactionQueue,
      transactionService,
      networkService,
      notificationManager,
      cacheService,
      options: {
        chainId,
        EVMRelayerManagerMap, // TODO // Review a better way
      },
    });

    retryTransactionQueueMap[chainId].consume(
      retryTransactionServiceMap[chainId].onMessageReceived,
    );
    log.info(`Retry transaction service setup for chainId: ${chainId}`);

    // eslint-disable-next-line max-len
    bundlerSimulationServiceMap[chainId] = new BundlerSimulationService(
      networkService,
      gasPriceService,
    );

    bundlerSimulationServiceMapV07[chainId] = new BundlerSimulationServiceV07(
      networkService,
      gasPriceService,
    );
    const { entryPointData, entryPointV07Data } = config;

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
              public: networkService.provider,
            },
          }),
        });
      }
    }

    for (const [
      entryPointAddress,
      entryPointSupportedChainIdsAndAbi,
    ] of Object.entries(entryPointV07Data)) {
      if (
        entryPointSupportedChainIdsAndAbi.supportedChainIds.includes(chainId)
      ) {
        entryPointMapV07[chainId].push({
          address: entryPointAddress,
          entryPointContract: getContract({
            abi: ENTRY_POINT_V07_ABI,
            address: entryPointAddress as `0x${string}`,
            client: {
              public: networkService.provider,
            },
          }),
        });
      }
    }

    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      if (type === TransactionType.BUNDLER) {
        const bundlerRelayerManager =
          EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][
            chainId
          ];
        if (!bundlerRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }
        log.info(
          `Setting up Bundler transaction queue for chainId: ${chainId}`,
        );
        const bundlerQueue: IQueue<BundlerTransactionMessageType> =
          new BundlerTransactionQueue({
            chainId,
          });

        await bundlerQueue.connect();
        log.info(
          `Bundler transaction queue setup complete for chainId: ${chainId}`,
        );

        log.info(
          `Setting up Bundler consumer, relay service, simulation & validation service for chainId: ${chainId}`,
        );
        const bundlerConsumer = new BundlerConsumer({
          queue: bundlerQueue,
          relayerManager: bundlerRelayerManager,
          transactionService,
          cacheService,
          options: {
            chainId,
            entryPointMap,
            entryPointMapV07,
          },
        });
        // start listening for transaction
        await bundlerQueue.consume(bundlerConsumer.onMessageReceived);

        const bundlerRelayService = new BundlerRelayService(bundlerQueue);
        routeTransactionToRelayerMap[chainId][type] = bundlerRelayService;

        log.info(
          `Bundler consumer, relay service, simulation and validation service setup complete for chainId: ${chainId}`,
        );
      }
    }
  }

  // eslint-disable-next-line no-new
  statusService = new StatusService({
    cacheService,
    networkServiceMap,
    evmRelayerManagerMap: EVMRelayerManagerMap,
    dbInstance,
    gasPriceServiceMap,
    bundlerSimulationServiceMap,
    bundlerSimulationServiceMapV07,
  });
  log.info("<=== Config setup completed ===>");
})();

export {
  routeTransactionToRelayerMap,
  bundlerSimulationServiceMap,
  bundlerSimulationServiceMapV07,
  entryPointMap,
  entryPointMapV07,
  EVMRelayerManagerMap,
  transactionServiceMap,
  transactionDao,
  userOperationDao,
  userOperationStateDao,
  userOperationV07Dao,
  statusService,
  networkServiceMap,
  gasPriceServiceMap,
};
