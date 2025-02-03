import nodeconfig from "config";
import { getContract, parseEther } from "viem";
import amqp from "amqplib";
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
  SendUserOperation,
  EntryPointMapType,
  EntryPointV07MapType,
  EVMRawTransactionType,
  TransactionType,
} from "../types";
import { UserOperationStateDAO } from "../db/dao/UserOperationStateDAO";
import { parseError } from "../utils";
import { GasPriceService } from "../gas-price";
import { CacheFeesJob } from "../gas-price/jobs/CacheFees";
import { FlashbotsClient } from "../network/FlashbotsClient";
import {
  ENTRYPOINT_V6_ABI,
  ENTRYPOINT_V7_ABI,
  supportedChains,
} from "@biconomy/gas-estimations";
import { Logger } from "pino";
import { logMeasureTime } from "../utils/timing";

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

let statusService: IStatusService;

// >> Main function to start the bundler <<
(async () => {
  const startTime = Date.now();
  const bootId = startTime.toString();

  const _log = log.child({ bootId });

  _log.info({ supportedNetworks }, "Bundler is booting up, please wait...");

  await dbInstance.connect();
  await cacheService.connect();

  const queueUrl =
    process.env.BUNDLER_QUEUE_URL || nodeconfig.get<string>("queueUrl");

  // disable heartbeat as per CloudAMQP recommendation
  const rabbitMqConnection = await amqp.connect(queueUrl, {
    heartbeat: 0,
  });

  const networkSetupPromises: Promise<void>[] = [];
  for (const chainId of supportedNetworks) {
    networkSetupPromises.push(setupNetwork(chainId, rabbitMqConnection, _log));
  }

  await Promise.all(networkSetupPromises);

  statusService = new StatusService({
    cacheService,
    networkServiceMap,
    evmRelayerManagerMap: EVMRelayerManagerMap,
    dbInstance,
    gasPriceServiceMap,
    bundlerSimulationServiceMap,
    bundlerSimulationServiceMapV07,
  });

  const bootTimeSeconds = (Date.now() - startTime) / 1000;

  _log.info({ supportedNetworks, bootTimeSeconds }, "Bundler is up!");
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

async function setupNetwork(
  chainId: number,
  rabbitMqConnection: amqp.Connection,
  log: Logger,
) {
  const chainName = supportedChains[chainId]?.name;
  const _log = log.child({ chainId, chainName });

  _log.info(`Start network setup...`);

  routeTransactionToRelayerMap[chainId] = {};
  entryPointMap[chainId] = [];
  entryPointMapV07[chainId] = [];

  if (!config.chains.providers || !config.chains.providers[chainId]) {
    throw new Error(`No providers in config for chainId: ${chainId}`);
  }

  const networkService = await setupEVMNetworkService(chainId, _log);
  networkServiceMap[chainId] = networkService;

  _log.info(`Start Gas Price Service setup...`);
  const [gasPriceService] = await logMeasureTime(
    _log,
    "Gas Price Service setup complete!",
    async () => setupGasPriceService(networkService, chainId, _log),
  );
  gasPriceServiceMap[chainId] = gasPriceService;

  _log.info(`Start Retry Transaction Queue setup...`);
  const [retryTransactionQueue] = await logMeasureTime(
    _log,
    "Retry Transaction Queue setup complete!",
    async () => setupRetryTransactionQueue(chainId, rabbitMqConnection),
  );
  retryTransactionQueueMap[chainId] = retryTransactionQueue;

  _log.info(`Start EVM Transaction Listener setup...`);
  const [transactionListener] = await logMeasureTime(
    _log,
    "EVM Transaction Listener setup complete!",
    async () =>
      setupEVMTransactionListener(
        networkService,
        retryTransactionQueue,
        chainId,
      ),
  );
  transactionListenerMap[chainId] = transactionListener;

  _log.info(`Start Nonce Manager setup...`);
  const [nonceManager] = await logMeasureTime(
    _log,
    "Nonce manager setup complete!",
    async () => setupNonceManager(chainId, networkService),
  );

  _log.info(`Start EVM Transaction Service setup...`);
  const [transactionService] = await logMeasureTime(
    _log,
    "EVM Transaction Service setup complete!",
    async () =>
      new EVMTransactionService({
        networkService,
        transactionListener,
        nonceManager,
        gasPriceService,
        transactionDao,
        cacheService,
        userOperationStateDao,
        options: {
          chainId,
        },
      }),
  );
  transactionServiceMap[chainId] = transactionService;

  _log.info(`Start Relayer Manager setup...`);
  await logMeasureTime(_log, "Relayer Manager setup complete!", async () =>
    setupRelayerManagers(
      networkService,
      gasPriceService,
      transactionService,
      nonceManager,
      chainId,
      _log,
    ),
  );

  _log.info(`Start Retry Transaction Service setup...`);
  await logMeasureTime(
    _log,
    "Retry transaction service setup complete!",
    async () =>
      setupTransactionService(
        chainId,
        retryTransactionQueue,
        transactionService,
        networkService,
      ),
  );

  _log.info(`Start Bundler Simulation Service setup...`);
  await logMeasureTime(
    _log,
    "Bundler Simulation Service setup complete!",
    async () =>
      setupBundlerSimulationServices(chainId, networkService, gasPriceService),
  );

  const { entryPointData, entryPointV07Data } = config;

  _log.info(`Start Entry Point Contracts setup...`);
  await logMeasureTime(
    _log,
    "Entry Point Contracts setup complete!",
    async () =>
      setupEntryPointContracts(
        entryPointData,
        chainId,
        networkService,
        entryPointV07Data,
      ),
  );

  // for each network get transaction type
  await setupSupportedTransactionTypes(
    chainId,
    _log,
    rabbitMqConnection,
    transactionService,
  );

  _log.info(`Network setup complete!`);
}

async function setupSupportedTransactionTypes(
  chainId: number,
  _log: Logger,
  rabbitMqConnection: amqp.Connection,
  transactionService: EVMTransactionService,
) {
  for (const type of supportedTransactionType[chainId]) {
    if (type === TransactionType.BUNDLER) {
      const bundlerRelayerManager =
        EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][
          chainId
        ];
      if (!bundlerRelayerManager) {
        throw new Error(`Relayer manager not found for ${type}`);
      }
      _log.info(`Setting up Bundler transaction queue`);
      const bundlerQueue: IQueue<SendUserOperation> =
        new BundlerTransactionQueue({
          chainId,
        });

      await bundlerQueue.connect(rabbitMqConnection);
      _log.info(`Bundler transaction queue setup complete`);

      _log.info(
        `Setting up Bundler consumer, relay service, simulation & validation service`,
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

      _log.info(
        `Bundler consumer, relay service, simulation and validation service setup complete`,
      );
    }
  }
}

function setupEntryPointContracts(
  entryPointData: { [address: string]: { supportedChainIds: Array<number> } },
  chainId: number,
  networkService: EVMNetworkService,
  entryPointV07Data: {
    [address: `0x${string}`]: { supportedChainIds: Array<number> };
  },
) {
  for (const [
    entryPointAddress,
    entryPointSupportedChainIdsAndAbi,
  ] of Object.entries(entryPointData)) {
    if (entryPointSupportedChainIdsAndAbi.supportedChainIds.includes(chainId)) {
      entryPointMap[chainId].push({
        address: entryPointAddress,
        entryPointContract: getContract({
          abi: ENTRYPOINT_V6_ABI,
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
    if (entryPointSupportedChainIdsAndAbi.supportedChainIds.includes(chainId)) {
      entryPointMapV07[chainId].push({
        address: entryPointAddress,
        entryPointContract: getContract({
          abi: ENTRYPOINT_V7_ABI,
          address: entryPointAddress as `0x${string}`,
          client: {
            public: networkService.provider,
          },
        }),
      });
    }
  }
}

function setupTransactionService(
  chainId: number,
  retryTransactionQueue: RetryTransactionHandlerQueue,
  transactionService: EVMTransactionService,
  networkService: EVMNetworkService,
) {
  retryTransactionServiceMap[chainId] = new EVMRetryTransactionService({
    retryTransactionQueue,
    transactionService,
    networkService,
    cacheService,
    options: {
      chainId,
      EVMRelayerManagerMap,
    },
  });

  retryTransactionQueueMap[chainId].consume(
    retryTransactionServiceMap[chainId].onMessageReceived,
  );
}

async function setupRelayerManagers(
  networkService: EVMNetworkService,
  gasPriceService: GasPriceService,
  transactionService: EVMTransactionService,
  nonceManager: EVMNonceManager,
  chainId: number,
  _log: Logger,
) {
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
          chainId,
          nonceManager,
          networkService,
        ),
        gasLimitMap: relayerManager.gasLimitMap,
      },
    });
    EVMRelayerManagerMap[relayerManager.name][chainId] = relayerMangerInstance;

    const addressList = await relayerMangerInstance.createRelayers();

    _log.info(
      `Relayer address list length: ${addressList.length} for relayerManager: ${relayerManager.name}`,
    );

    /*
      UNSAFE: Disable funding relayers for testing purposes or local devenv.
      This is enabled by default but you can set it to false if you want to run smoke tests for example
    */
    if (nodeconfig.get<boolean>("boot.fundRelayers")) {
      await relayerMangerInstance.fundRelayers(addressList);
    } else {
      _log.warn(`Relayer funding is disabled`);
    }
  }
}

function setupEVMTransactionListener(
  networkService: EVMNetworkService,
  retryTransactionQueue: RetryTransactionHandlerQueue,
  chainId: number,
) {
  return new EVMTransactionListener({
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
}

function setupNonceManager(chainId: number, networkService: EVMNetworkService) {
  const nonceExpiryTTL = 3600;
  const nonceManager = new EVMNonceManager({
    options: {
      chainId,
      nonceExpiryTTL,
    },
    networkService,
    cacheService,
  });
  return nonceManager;
}

async function setupRetryTransactionQueue(
  chainId: number,
  rabbitMqConnection: amqp.Connection,
) {
  const retryTransactionQueue = new RetryTransactionHandlerQueue({
    chainId,
    nodePathIndex: config.relayer.nodePathIndex,
  });

  await retryTransactionQueue.connect(rabbitMqConnection);

  return retryTransactionQueue;
}

function setupGasPriceService(
  networkService: EVMNetworkService,
  chainId: number,
  log: Logger,
) {
  const gasPriceService = new GasPriceService(cacheService, networkService, {
    chainId,
    EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
  });

  // added check for relayer node path in order to run on only one server
  if (gasPriceService && config.relayer.nodePathIndex === 0) {
    const gasPriceSchedule = `*/${config.chains.updateFrequencyInSeconds[chainId]} * * * * *`;
    const _log = log.child({ gasPriceSchedule });

    _log.info(`Scheduling CacheFeesJob...'`);
    try {
      const cacheFeesJob = new CacheFeesJob(gasPriceSchedule, gasPriceService);
      cacheFeesJob.start();
    } catch (err) {
      _log.error(`Error in scheduling CacheFeesJob: ${parseError(err)}`);
    }
  }
  return gasPriceService;
}

async function setupEVMNetworkService(chainId: number, log: Logger) {
  log.info(`Setting up the EVMNetworkService...`);

  const [networkService] = await logMeasureTime(
    log,
    "EVMNetworkService setup complete!",
    async () => {
      if (
        nodeconfig
          .get<number[]>("flashbots.supportedNetworks")
          .includes(chainId)
      ) {
        return new EVMNetworkService(
          {
            chainId,
          },
          new FlashbotsClient(),
        );
      }
      return new EVMNetworkService({
        chainId,
      });
    },
  );

  return networkService;
}

// TODO: Refactor this, no need to have two different services
function setupBundlerSimulationServices(
  chainId: number,
  networkService: EVMNetworkService,
  gasPriceService: GasPriceService,
) {
  log.info({ chainId }, `Setting up the BundlerSimulationService...`);

  // For EPv0.6.0
  bundlerSimulationServiceMap[chainId] = new BundlerSimulationService({
    networkService,
    gasPriceService,
  });

  // For EPv0.7.0
  // TODO: Refactor the V07 service the same way you did v6, or not necessary if you merge them
  bundlerSimulationServiceMapV07[chainId] = new BundlerSimulationServiceV07(
    networkService,
    gasPriceService,
  );

  log.info(
    {
      chainId,
    },
    `BundlerSimulationService setup complete!`,
  );
}

export interface BlockNativeResponse {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  blockPrices: BlockPrice[];
}

export interface BlockPrice {
  blockNumber: number;
  estimatedTransactionCount: number;
  baseFeePerGas: number;
  blobBaseFeePerGas: number;
  estimatedPrices: EstimatedPrice[];
}

export interface EstimatedPrice {
  confidence: number;
  price: number;
  maxPriorityFeePerGas: number;
  maxFeePerGas: number;
}
