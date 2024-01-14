/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-await-in-loop */
import { schedule } from "node-cron";
import { getContract, parseEther } from "viem";
import { config } from "../../config";
import { EVMAccount, IEVMAccount } from "../../relayer/account";
import {
  AAConsumer,
  SCWConsumer,
  SocketConsumer,
  BundlerConsumer,
} from "../../relayer/consumer";
import { EVMNonceManager } from "../../relayer/nonce-manager";
import {
  EVMRelayerManager,
  IRelayerManager,
} from "../../relayer/relayer-manager";
import { EVMRelayerQueue } from "../../relayer/relayer-queue";
import { EVMRetryTransactionService } from "../../relayer/retry-transaction-service";
import { EVMTransactionListener } from "../../relayer/transaction-listener";
import { EVMTransactionService } from "../../relayer/transaction-service";
import { FeeOption } from "../../server/services";
import { RedisCacheService } from "../cache";
import { Mongo, TransactionDAO } from "../db";
import { UserOperationDAO } from "../db/dao/UserOperationDAO";
import { IQueue } from "../interface";
import { logger } from "../logger";
import { relayerManagerTransactionTypeNameMap } from "../maps";
import { EVMNetworkService } from "../network";
import { NotificationManager } from "../notification";
import { SlackNotificationService } from "../notification/slack/SlackNotificationService";
import {
  AATransactionQueue,
  BundlerTransactionQueue,
  RetryTransactionHandlerQueue,
  SCWTransactionQueue,
  TransactionHandlerQueue,
} from "../queue";
import {
  AARelayService,
  SCWRelayService,
  BundlerRelayService,
} from "../relay-service";
import { BundlerSimulationService, SCWSimulationService } from "../simulation";
import {
  AlchemySimulationService,
  TenderlySimulationService,
} from "../simulation/external-simulation";
import { IStatusService, StatusService } from "../status";
import { CMCTokenPriceManager } from "../token-price";
import {
  AATransactionMessageType,
  BundlerTransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionType,
} from "../types";
import { UserOperationStateDAO } from "../db/dao/UserOperationStateDAO";
import { ENTRY_POINT_ABI } from "../constants";
import { customJSONStringify } from "../utils";
import { GasPriceService } from "../gas-price";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [transactionType: string]:
      | AARelayService
      | SCWRelayService
      | BundlerRelayService;
  };
} = {};

const feeOptionMap: {
  [chainId: number]: FeeOption;
} = {};

const gasPriceServiceMap: {
  [chainId: number]: GasPriceService;
} = {};

const bundlerSimulatonServiceMap: {
  [chainId: number]: BundlerSimulationService;
} = {};

const scwSimulationServiceMap: {
  [chainId: number]: SCWSimulationService;
} = {};

const entryPointMap: EntryPointMapType = {};

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
const userOperationStateDao = new UserOperationStateDAO();

const socketConsumerMap: Record<number, SocketConsumer> = {};
const retryTransactionSerivceMap: Record<number, EVMRetryTransactionService> =
  {};
const transactionSerivceMap: Record<number, EVMTransactionService> = {};
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
    config.slack.token,
    config.slack.channel,
  );
  const notificationManager = new NotificationManager(slackNotificationService);

  const tokenService = new CMCTokenPriceManager(cacheService, {
    apiKey: config.tokenPrice.coinMarketCapApi,
    networkSymbolCategories: config.tokenPrice.networkSymbols,
    updateFrequencyInSeconds: 90,
    symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
  });
  // added check for relayer node path in order to run on only one server
  if (config.relayer.nodePathIndex === 0) {
    tokenService.schedule();
  }

  log.info(
    `Setting up instances for following chainIds: ${customJSONStringify(
      supportedNetworks,
    )}`,
  );
  for (const chainId of supportedNetworks) {
    log.info(`Setup of services started for chainId: ${chainId}`);
    routeTransactionToRelayerMap[chainId] = {};
    entryPointMap[chainId] = [];

    if (!config.chains.provider[chainId]) {
      throw new Error(`No provider for chainId ${chainId}`);
    }

    log.info(`Setting up network service for chainId: ${chainId}`);
    const networkService = new EVMNetworkService({
      chainId,
      rpcUrl: config.chains.provider[chainId],
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
      schedule(`*/${10} * * * * *`, () => {
        gasPriceService.setup();
      });
    }
    if (!gasPriceService) {
      throw new Error(`Gasprice service is not setup for chainId ${chainId}`);
    }
    gasPriceServiceMap[chainId] = gasPriceService;
    log.info(`Gas price service setup complete for chainId: ${chainId}`);

    log.info(`Setting up transaction queue for chainId: ${chainId}`);
    const transactionQueue = new TransactionHandlerQueue({
      chainId,
    });
    await transactionQueue.connect();
    log.info(`Transaction queue setup complete for chainId: ${chainId}`);

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
      transactionQueue,
      retryTransactionQueue,
      transactionDao,
      userOperationDao,
      userOperationStateDao,
      options: {
        chainId,
        entryPointMap,
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
    transactionSerivceMap[chainId] = transactionService;
    log.info(`Transaction service setup complete for chainId: ${chainId}`);

    log.info(`Setting up relayer manager for chainId: ${chainId}`);
    for (const relayerManager of config.relayerManagers) {
      if (
        relayerManager.name === "RM2" &&
        config.nonRM2SupportedNetworks.includes(chainId)
      ) {
        log.info(`chainId: ${chainId} not supported on relayer manager RM2`);
        // eslint-disable-next-line no-continue
        continue;
      }
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
            relayerManager.ownerAccountDetails[chainId].publicKey,
            relayerManager.ownerAccountDetails[chainId].privateKey,
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
    retryTransactionSerivceMap[chainId] = new EVMRetryTransactionService({
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
      retryTransactionSerivceMap[chainId].onMessageReceived,
    );
    log.info(`Retry transaction service setup for chainId: ${chainId}`);

    log.info(`Setting up socket complete consumer for chainId: ${chainId}`);
    socketConsumerMap[chainId] = new SocketConsumer({
      queue: transactionQueue,
      options: {
        chainId,
        wssUrl: config.socketService.wssUrl,
        EVMRelayerManagerMap,
      },
    });
    transactionQueue.consume(socketConsumerMap[chainId].onMessageReceived);
    log.info(
      `Socket consumer setup complete for chainId: ${chainId} and attached to transaction queue`,
    );

    log.info(`Setting up fee options service for chainId: ${chainId}`);
    const feeOptionService = new FeeOption(gasPriceService, cacheService, {
      chainId,
    });
    feeOptionMap[chainId] = feeOptionService;
    log.info(`Fee option service setup complete for chainId: ${chainId}`);

    const tenderlySimulationService = new TenderlySimulationService(
      gasPriceService,
      cacheService,
      {
        tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
        tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
        tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
      },
    );

    const alchemySimulationService = new AlchemySimulationService(
      networkService,
    );

    // eslint-disable-next-line max-len
    bundlerSimulatonServiceMap[chainId] = new BundlerSimulationService(
      networkService,
      tenderlySimulationService,
      alchemySimulationService,
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
            publicClient: networkService.provider,
          }),
        });
      }
    }

    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      if (type === TransactionType.AA) {
        const aaRelayerManager =
          EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][
            chainId
          ];
        if (!aaRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }
        log.info(`Setting up AA transaction queue for chainId: ${chainId}`);
        const aaQueue: IQueue<AATransactionMessageType> =
          new AATransactionQueue({
            chainId,
          });

        await aaQueue.connect();
        log.info(`AA transaction queue setup complete for chainId: ${chainId}`);

        log.info(
          `Setting up AA consumer, relay service & simulation service for chainId: ${chainId}`,
        );
        const aaConsumer = new AAConsumer({
          queue: aaQueue,
          relayerManager: aaRelayerManager,
          transactionService,
          cacheService,
          options: {
            chainId,
            entryPointMap,
          },
        });
        // start listening for transaction
        await aaQueue.consume(aaConsumer.onMessageReceived);

        const aaRelayService = new AARelayService(aaQueue);
        routeTransactionToRelayerMap[chainId][type] = aaRelayService;

        log.info(
          `AA consumer, relay service & simulation service setup complete for chainId: ${chainId}`,
        );
      } else if (type === TransactionType.SCW) {
        // queue for scw
        log.info(`Setting up SCW transaction queue for chainId: ${chainId}`);
        const scwQueue: IQueue<SCWTransactionMessageType> =
          new SCWTransactionQueue({
            chainId,
          });
        await scwQueue.connect();
        log.info(
          `SCW transaction queue setup complete for chainId: ${chainId}`,
        );

        const scwRelayerManager =
          EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][
            chainId
          ];
        if (!scwRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }

        log.info(
          `Setting up SCW consumer, relay service & simulation service for chainId: ${chainId}`,
        );
        const scwConsumer = new SCWConsumer({
          queue: scwQueue,
          relayerManager: scwRelayerManager,
          transactionService,
          cacheService,
          options: {
            chainId,
          },
        });
        await scwQueue.consume(scwConsumer.onMessageReceived);

        const scwRelayService = new SCWRelayService(scwQueue);
        routeTransactionToRelayerMap[chainId][type] = scwRelayService;

        scwSimulationServiceMap[chainId] = new SCWSimulationService(
          networkService,
          tenderlySimulationService,
        );
        log.info(
          `SCW consumer, relay service & simulation service setup complete for chainId: ${chainId}`,
        );
      } else if (type === TransactionType.BUNDLER) {
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
  });
  log.info("<=== Config setup completed ===>");
})();

export {
  routeTransactionToRelayerMap,
  feeOptionMap,
  bundlerSimulatonServiceMap,
  scwSimulationServiceMap,
  entryPointMap,
  EVMRelayerManagerMap,
  transactionSerivceMap,
  transactionDao,
  userOperationDao,
  userOperationStateDao,
  statusService,
  networkServiceMap,
  gasPriceServiceMap,
};
