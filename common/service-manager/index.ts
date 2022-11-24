/* eslint-disable no-await-in-loop */
import { ethers } from 'ethers';
import { config } from '../../config';
import { EVMAccount, IEVMAccount } from '../../relayer/src/services/account';
import {
  AAConsumer,
  SCWConsumer,
  SocketConsumer,
  CCMPConsumer,
} from '../../relayer/src/services/consumer';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import { EVMRelayerManager, IRelayerManager } from '../../relayer/src/services/relayer-manager';
import { EVMRelayerQueue } from '../../relayer/src/services/relayer-queue';
import { EVMRetryTransactionService } from '../../relayer/src/services/retry-transaction-service';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';
import { FeeOption } from '../../server/src/services';
import { CrossChainTransactionHandlerService } from '../../server/src/services/cross-chain/transaction-handler';
import {
  AxelarRouterService,
  HyperlaneRouterService,
  WormholeRouterService,
} from '../../server/src/services/cross-chain/router-service';
import { ICCMPRouterService } from '../../server/src/services/cross-chain/router-service/interfaces';
import { RedisCacheService } from '../cache';
import { Mongo, TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { logger } from '../log-config';
import { relayerManagerTransactionTypeNameMap } from '../maps';
import { EVMNetworkService } from '../network';
import { NotificationManager } from '../notification';
import { SlackNotificationService } from '../notification/slack/SlackNotificationService';
import {
  AATransactionQueue,
  CCMPTransactionQueue,
  RetryTransactionHandlerQueue,
  SCWTransactionQueue,
  TransactionHandlerQueue,
} from '../queue';
import { AARelayService, CCMPRelayService, SCWRelayService } from '../relay-service';
import { AASimulationService, CCMPSimulationService, SCWSimulationService } from '../simulation';
import { TenderlySimulationService } from '../simulation/external-simulation';
import { CMCTokenPriceManager, TokenPriceConversionService } from '../token';
import { IStatusService, StatusService } from '../status';
import {
  AATransactionMessageType,
  CCMPRouterName,
  CrossChainTransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionType,
} from '../types';
import { CrossChainTransactionDAO } from '../db/dao/CrossChainTransactionDao';
import { CrossChainRetryHandlerQueue } from '../queue/CrossChainRetryHandlerQueue';
import { CrossChainRetryTransactionService } from '../../server/src/services/cross-chain/retry-transaction-service';
import { IndexerService } from '../indexer/IndexerService';
import { CCMPGatewayService } from '../../server/src/services/cross-chain/gateway';
import type { ICrossChainGasEstimationService } from '../../server/src/services/cross-chain/gas-estimation/interfaces/ICrossChainGasEstimationService';
import { CrossChainGasEstimationService } from '../../server/src/services/cross-chain/gas-estimation';
import { LiquidityPoolService, LiquidityTokenManagerService } from '../../server/src/services/cross-chain/liquidity';
import { ICrossChainTransactionStatusService } from '../../server/src/services/cross-chain/transaction-status/interfaces/ICrossChainTransactionStatusService';
import { CrosschainTransactionStatusService } from '../../server/src/services/cross-chain/transaction-status';
import { ETHCallSimulationService } from '../simulation/external-simulation/EthCallSimulationService';

const log = logger(module);

const networkServiceMap: Record<number, EVMNetworkService> = {};

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [TransactionType.AA]?: AARelayService;
    [TransactionType.SCW]?: SCWRelayService;
    [TransactionType.CROSS_CHAIN]?: CCMPRelayService;
  };
} = {};

const feeOptionMap: {
  [chainId: number]: FeeOption;
} = {};

const aaSimulatonServiceMap: {
  [chainId: number]: AASimulationService;
} = {};

const scwSimulationServiceMap: {
  [chainId: number]: SCWSimulationService;
} = {};

const entryPointMap: EntryPointMapType = {};

const ccmpServiceMap: {
  [chainId: number]: CrossChainTransactionHandlerService;
} = {};

const ccmpRouterMap: {
  [chainId: number]: {
    [key in CCMPRouterName]?: ICCMPRouterService;
  };
} = {};

const ccmpGatewayServiceMap: {
  [chainId: number]: CCMPGatewayService;
} = {};

const crossChainGasEstimationServiceMap: {
  [chainId: number]: ICrossChainGasEstimationService;
} = {};

const liquidityTokenManagerService = new LiquidityTokenManagerService();
const liquidityPoolService = new LiquidityPoolService(
  liquidityTokenManagerService,
  networkServiceMap,
  config.feeOption.tokenContractAddress,
);

const indexerService = new IndexerService(config.indexer.baseUrl);

const dbInstance = Mongo.getInstance();
const cacheService = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

const EVMRelayerManagerMap: {
  [name: string]: {
    [chainId: number]: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
  };
} = {};

const transactionDao = new TransactionDAO();
const crossChainTransactionDAO = new CrossChainTransactionDAO();

const socketConsumerMap: Record<number, SocketConsumer> = {};
const retryTransactionSerivceMap: Record<number, EVMRetryTransactionService> = {};
const transactionSerivceMap: Record<number, EVMTransactionService> = {};
const transactionListenerMap: Record<number, EVMTransactionListener> = {};
const retryTransactionQueueMap: {
  [key: number]: RetryTransactionHandlerQueue;
} = {};
const crossChainRetryTransactionQueueMap: {
  [key: number]: CrossChainRetryHandlerQueue;
} = {};
const crossChainRetryTransactionServiceMap: {
  [key: number]: CrossChainRetryTransactionService;
} = {};
const crossChainTransactionStatusServiceMap: {
  [chainId: number]: ICrossChainTransactionStatusService;
} = {};

// eslint-disable-next-line import/no-mutable-exports
let statusService: IStatusService;

(async () => {
  await dbInstance.connect();
  await cacheService.connect();

  const ccmpServiceInitPromises: Promise<void>[] = [];

  const slackNotificationService = new SlackNotificationService(
    config.slack.token,
    config.slack.channel,
  );
  const notificationManager = new NotificationManager(slackNotificationService);

  const tokenService = new CMCTokenPriceManager(cacheService, {
    baseURL: config.tokenPrice.coinMarketCapUrl,
    apiKey: config.tokenPrice.coinMarketCapApi,
    networkSymbolCategories: config.tokenPrice.networkSymbols,
    updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
    symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
  });
  // added check for relayer node path in order to run on only one server
  if (config.relayer.nodePathIndex === 0) {
    tokenService.schedule();
  }

  const tokenPriceConversionService = new TokenPriceConversionService(
    tokenService,
    networkServiceMap,
    config.feeOption.tokenContractAddress,
  );

  log.info(`Setting up instances for following chainIds: ${JSON.stringify(supportedNetworks)}`);
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
      fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
    });
    log.info(`Network service setup complete for chainId: ${chainId}`);
    networkServiceMap[chainId] = networkService;

    log.info(`Setting up gas price manager for chainId: ${chainId}`);
    const gasPriceManager = new GasPriceManager(cacheService, networkService, {
      chainId,
      EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
    });
    log.info(`Gas price manager setup complete for chainId: ${chainId}`);

    log.info(`Setting up gas price service for chainId: ${chainId}`);
    const gasPriceService = gasPriceManager.setup();
    // added check for relayer node path in order to run on only one server
    if (gasPriceService && config.relayer.nodePathIndex === 0) {
      gasPriceService.schedule();
    }
    if (!gasPriceService) {
      throw new Error(`Gasprice service is not setup for chainId ${chainId}`);
    }
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
    });
    retryTransactionQueueMap[chainId] = retryTransactionQueue;
    await retryTransactionQueueMap[chainId].connect();
    log.info(`Retry transaction queue setup complete for chainId: ${chainId}`);

    crossChainRetryTransactionQueueMap[chainId] = new CrossChainRetryHandlerQueue({ chainId });
    await crossChainRetryTransactionQueueMap[chainId].connect();

    log.info(`Setting up nonce manager for chainId: ${chainId}`);
    const nonceManager = new EVMNonceManager({
      options: {
        chainId,
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
      crossChainRetryHandlerQueueMap: crossChainRetryTransactionQueueMap,
      crossChainTransactionDAO: new CrossChainTransactionDAO(),
      options: {
        chainId,
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
      options: {
        chainId,
      },
    });
    transactionSerivceMap[chainId] = transactionService;
    log.info(`Transaction service setup complete for chainId: ${chainId}`);

    log.info(`Setting up relayer manager for chainId: ${chainId}`);
    const relayerQueue = new EVMRelayerQueue([]);
    for (const relayerManager of config.relayerManagers) {
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
          inactiveRelayerCountThreshold: relayerManager.inactiveRelayerCountThreshold[chainId],
          pendingTransactionCountThreshold:
            relayerManager.pendingTransactionCountThreshold[chainId],
          newRelayerInstanceCount: relayerManager.newRelayerInstanceCount[chainId],
          fundingBalanceThreshold: ethers.utils
            .parseEther(relayerManager.fundingBalanceThreshold[chainId].toString()),
          fundingRelayerAmount: relayerManager.fundingRelayerAmount[chainId],
          ownerAccountDetails: new EVMAccount(
            relayerManager.ownerAccountDetails[chainId].publicKey,
            relayerManager.ownerAccountDetails[chainId].privateKey,
          ),
          gasLimitMap: relayerManager.gasLimitMap,
        },
      });
      EVMRelayerManagerMap[relayerManager.name][chainId] = relayerMangerInstance;

      const addressList = await relayerMangerInstance.createRelayers();
      log.info(
        `Relayer address list length: ${addressList.length} and minRelayerCount: ${JSON.stringify(relayerManager.minRelayerCount)}`,
      );
      await relayerMangerInstance.fundRelayers(addressList);
    }
    log.info(`Relayer manager setup complete for chainId: ${chainId}`);

    log.info(`Setting up retry transaction service for chainId: ${chainId}`);
    retryTransactionSerivceMap[chainId] = new EVMRetryTransactionService({
      retryTransactionQueue,
      transactionService,
      networkService,
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
    log.info(`Socket consumer setup complete for chainId: ${chainId} and attached to transaction queue`);

    log.info(`Setting up fee options service for chainId: ${chainId}`);
    const feeOptionService = new FeeOption(gasPriceService, cacheService, {
      chainId,
    });
    feeOptionMap[chainId] = feeOptionService;
    log.info(`Fee option service setup complete for chainId: ${chainId}`);

    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      const aaRelayerManager = EVMRelayerManagerMap[
        relayerManagerTransactionTypeNameMap[type]][chainId];
      if (!aaRelayerManager) {
        throw new Error(`Relayer manager not found for ${type}`);
      }

      if (type === TransactionType.AA) {
        log.info(`Setting up AA transaction queue for chaindId: ${chainId}`);
        const aaQueue: IQueue<AATransactionMessageType> = new AATransactionQueue({
          chainId,
        });

        await aaQueue.connect();
        log.info(`AA transaction queue setup complete for chainId: ${chainId}`);

        const { entryPointData } = config;

        for (
          let entryPointIndex = 0;
          entryPointIndex < entryPointData[chainId].length;
          entryPointIndex += 1
        ) {
          const entryPoint = entryPointData[chainId][entryPointIndex];

          entryPointMap[chainId].push({
            address: entryPoint.address,
            entryPointContract: networkService.getContract(
              JSON.stringify(entryPoint.abi),
              entryPoint.address,
            ),
          });
        }

        log.info(`Setting up AA consumer, relay service & simulation service for chainId: ${chainId}`);
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

        aaSimulatonServiceMap[chainId] = new AASimulationService(networkService);
        log.info(`AA consumer, relay service & simulation service setup complete for chainId: ${chainId}`);
      } else if (type === TransactionType.SCW) {
        // queue for scw
        log.info(`Setting up SCW transaction queue for chaindId: ${chainId}`);
        const scwQueue: IQueue<SCWTransactionMessageType> = new SCWTransactionQueue({
          chainId,
        });
        await scwQueue.connect();
        log.info(`SCW transaction queue setup complete for chainId: ${chainId}`);

        const scwRelayerManager = EVMRelayerManagerMap[
          relayerManagerTransactionTypeNameMap[type]][chainId];
        if (!scwRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }

        log.info(`Setting up SCW consumer, relay service & simulation service for chainId: ${chainId}`);
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

        const tenderlySimulationService = new TenderlySimulationService(gasPriceService, {
          tenderlyUser: config.simulationData.tenderlyData.tenderlyUser,
          tenderlyProject: config.simulationData.tenderlyData.tenderlyProject,
          tenderlyAccessKey: config.simulationData.tenderlyData.tenderlyAccessKey,
        });
        scwSimulationServiceMap[chainId] = new SCWSimulationService(
          networkService,
          tenderlySimulationService,
        );
        log.info(`SCW consumer, relay service & simulation service setup complete for chainId: ${chainId}`);
      } else if (type === TransactionType.CROSS_CHAIN) {
        // queue for ccmp
        const ccmpQueue: IQueue<CrossChainTransactionMessageType> = new CCMPTransactionQueue({
          chainId,
        });
        await ccmpQueue.connect();

        ccmpGatewayServiceMap[chainId] = new CCMPGatewayService(
          config.ccmp.contracts[chainId].CCMPGateway,
          chainId,
          config.ccmp.abi.CCMPGateway,
          networkService,
        );

        const ccmpRelayerManager = EVMRelayerManagerMap[
          relayerManagerTransactionTypeNameMap[type]][chainId];
        if (!ccmpRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }

        const ccmpConsumer = new CCMPConsumer({
          queue: ccmpQueue,
          relayerManager: ccmpRelayerManager,
          transactionService,
          crossChainTransactionDAO,
          crossChainRetryHandlerQueue: crossChainRetryTransactionQueueMap[chainId],
          cacheService,
          options: {
            chainId,
          },
        });
        await ccmpQueue.consume(ccmpConsumer.onMessageReceived);

        const ccmpRelayService = new CCMPRelayService(ccmpQueue);
        routeTransactionToRelayerMap[chainId][type] = ccmpRelayService;

        ccmpRouterMap[chainId] = {};
        for (const routerName of config.ccmp.supportedRouters[chainId]) {
          switch (routerName) {
            case CCMPRouterName.WORMHOLE: {
              ccmpRouterMap[chainId][routerName] = new WormholeRouterService(
                chainId,
                networkService,
              );
              break;
            }
            case CCMPRouterName.AXELAR: {
              ccmpRouterMap[chainId][routerName] = new AxelarRouterService(chainId, networkService);
              break;
            }
            case CCMPRouterName.HYPERLANE: {
              ccmpRouterMap[chainId][routerName] = new HyperlaneRouterService(
                chainId,
                networkService,
              );
              break;
            }
            default: {
              throw new Error(`Router ${routerName} not supported`);
            }
          }
        }

        const ethCallSimulationService = new ETHCallSimulationService(
          chainId,
          config.simulationData.ethCallData.estimatorAddress[chainId],
          config.simulationData.ethCallData.estimatorAbi,
          networkServiceMap[chainId],
          gasPriceService,
        );

        const ccmpSimulationService = new CCMPSimulationService(
          chainId,
          ethCallSimulationService,
          ccmpGatewayServiceMap[chainId],
        );

        crossChainGasEstimationServiceMap[chainId] = new CrossChainGasEstimationService(
          chainId,
          ccmpSimulationService,
          tokenPriceConversionService,
          ccmpRouterMap[chainId],
          gasPriceService,
          config.feeOption.tokenContractAddress,
        );

        ccmpServiceMap[chainId] = new CrossChainTransactionHandlerService(
          chainId,
          cacheService,
          ccmpRouterMap[chainId],
          routeTransactionToRelayerMap,
          new CrossChainTransactionDAO(),
          crossChainRetryTransactionQueueMap[chainId],
          ccmpGatewayServiceMap,
          indexerService,
          crossChainGasEstimationServiceMap,
          transactionDao,
        );

        ccmpServiceInitPromises.push(ccmpServiceMap[chainId].init());

        crossChainRetryTransactionServiceMap[chainId] = new CrossChainRetryTransactionService(
          chainId,
          crossChainRetryTransactionQueueMap[chainId],
          ccmpServiceMap[chainId],
        );

        crossChainTransactionStatusServiceMap[chainId] = new CrosschainTransactionStatusService(
          dbInstance,
          networkServiceMap,
          ccmpGatewayServiceMap[chainId],
        );

        await crossChainRetryTransactionQueueMap[chainId].consume(
          crossChainRetryTransactionServiceMap[chainId].onMessageReceived,
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

  // Wait for CCMP Service to be initialized
  try {
    await Promise.all(ccmpServiceInitPromises);
    log.info('CCMP Services initialized');
  } catch (e) {
    log.error(`Error initializing CCMP Services: ${JSON.stringify(e)}`);
    throw e;
  }

  log.info('<=== Config setup completed ===>');
})();

export {
  routeTransactionToRelayerMap,
  feeOptionMap,
  aaSimulatonServiceMap,
  scwSimulationServiceMap,
  entryPointMap,
  EVMRelayerManagerMap,
  ccmpRouterMap,
  ccmpServiceMap,
  transactionSerivceMap,
  indexerService,
  transactionDao,
  statusService,
  liquidityPoolService,
  liquidityTokenManagerService,
  crossChainGasEstimationServiceMap,
  CrossChainTransactionDAO,
  networkServiceMap,
  crossChainTransactionStatusServiceMap,
};
