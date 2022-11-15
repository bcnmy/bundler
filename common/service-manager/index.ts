/* eslint-disable no-await-in-loop */
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
import { CrossChainTransactionHandlerService } from '../../cross-chain';
import {
  AxelarRouterService,
  HyperlaneRouterService,
  WormholeRouterService,
} from '../../cross-chain/router-service';
import { ICCMPRouterService } from '../../cross-chain/router-service/interfaces';
import { RedisCacheService } from '../cache';
import { Mongo, TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { logger } from '../log-config';
import { relayerManagerTransactionTypeNameMap } from '../maps';
import { EVMNetworkService } from '../network';
import {
  AATransactionQueue,
  CCMPTransactionQueue,
  RetryTransactionHandlerQueue,
  SCWTransactionQueue,
  TransactionHandlerQueue,
} from '../queue';
import { AARelayService, CCMPRelayService, SCWRelayService } from '../relay-service';
import { AASimulationService, SCWSimulationService } from '../simulation';
import { TenderlySimulationService } from '../simulation/external-simulation';
import { CMCTokenPriceManager, TokenPriceConversionService } from '../token';
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
import { CrossChainRetryTransactionService } from '../../cross-chain/retry-transaction-service';
import { IndexerService } from '../indexer/IndexerService';
import { CCMPGatewayService } from '../../cross-chain/gateway';
import { SDKBackendService } from '../sdk-backend-service';
import type { ICrossChainGasEstimationService } from '../../cross-chain/gas-estimation/interfaces/ICrossChainGasEstimationService';
import { CrossChainGasEstimationService } from '../../cross-chain/gas-estimation';

const log = logger(module);

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

const sdkBackendService = new SDKBackendService(config.sdkBackend.baseUrl);

const networkServiceMap: {
  [key: number]: EVMNetworkService;
} = {};

(async () => {
  await dbInstance.connect();
  await cacheService.connect();

  const ccmpServiceInitPromises: Promise<void>[] = [];

  for (const chainId of supportedNetworks) {
    routeTransactionToRelayerMap[chainId] = {};
    entryPointMap[chainId] = [];

    if (!config.chains.provider[chainId]) {
      throw new Error(`No provider for chainId ${chainId}`);
    }
    const networkService = new EVMNetworkService({
      chainId,
      rpcUrl: config.chains.provider[chainId],
      fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
    });
    networkServiceMap[chainId] = networkService;

    const gasPriceManager = new GasPriceManager(cacheService, networkService, {
      chainId,
      EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
    });

    const gasPriceService = gasPriceManager.setup();
    if (gasPriceService) {
      gasPriceService.schedule();
    }
    if (!gasPriceService) {
      throw new Error(`Gasprice service is not setup for chainId ${chainId}`);
    }

    const transactionQueue = new TransactionHandlerQueue({
      chainId,
    });
    await transactionQueue.connect();

    const retryTransactionQueue = new RetryTransactionHandlerQueue({
      chainId,
    });
    retryTransactionQueueMap[chainId] = retryTransactionQueue;
    await retryTransactionQueueMap[chainId].connect();

    crossChainRetryTransactionQueueMap[chainId] = new CrossChainRetryHandlerQueue({ chainId });
    await crossChainRetryTransactionQueueMap[chainId].connect();

    const nonceManager = new EVMNonceManager({
      options: {
        chainId,
      },
      networkService,
      cacheService,
    });

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

    const transactionService = new EVMTransactionService({
      networkService,
      transactionListener,
      nonceManager,
      gasPriceService,
      transactionDao,
      cacheService,
      options: {
        chainId,
      },
    });

    transactionSerivceMap[chainId] = transactionService;

    const relayerQueue = new EVMRelayerQueue([]);
    for (const relayerManager of config.relayerManagers) {
      if (!EVMRelayerManagerMap[relayerManager.name]) {
        EVMRelayerManagerMap[relayerManager.name] = {};
      }
      const relayerMangerInstance = new EVMRelayerManager({
        networkService,
        gasPriceService,
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
          fundingBalanceThreshold: relayerManager.fundingBalanceThreshold[chainId],
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
        `Relayer address list length: ${addressList.length} and minRelayerCount: ${relayerManager.minRelayerCount}`,
      );
      await relayerMangerInstance.fundRelayers(addressList);
    }

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

    socketConsumerMap[chainId] = new SocketConsumer({
      queue: transactionQueue,
      options: {
        chainId,
        wssUrl: config.socketService.wssUrl,
        EVMRelayerManagerMap,
      },
    });
    transactionQueue.consume(socketConsumerMap[chainId].onMessageReceived);

    const tokenService = new CMCTokenPriceManager(cacheService, {
      baseURL: config.tokenPrice.coinMarketCapUrl,
      apiKey: config.tokenPrice.coinMarketCapApi,
      networkSymbolCategories: config.tokenPrice.networkSymbols,
      updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
      symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
    });
    tokenService.schedule();

    const tokenPriceConversionService = new TokenPriceConversionService(
      tokenService,
      networkServiceMap,
      config.tokenPrice.symbolMapByChainId,
    );

    const feeOptionService = new FeeOption(gasPriceService, cacheService, {
      chainId,
    });
    feeOptionMap[chainId] = feeOptionService;
    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      const aaRelayerManager = EVMRelayerManagerMap[
        relayerManagerTransactionTypeNameMap[type]][chainId];
      if (!aaRelayerManager) {
        throw new Error(`Relayer manager not found for ${type}`);
      }

      if (type === TransactionType.AA) {
        const aaQueue: IQueue<AATransactionMessageType> = new AATransactionQueue({
          chainId,
        });

        await aaQueue.connect();

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

        const aaConsumer = new AAConsumer({
          queue: aaQueue,
          relayerManager: aaRelayerManager,
          transactionService,
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
      } else if (type === TransactionType.SCW) {
        // queue for scw
        const scwQueue: IQueue<SCWTransactionMessageType> = new SCWTransactionQueue({
          chainId,
        });
        await scwQueue.connect();

        const scwRelayerManager = EVMRelayerManagerMap[
          relayerManagerTransactionTypeNameMap[type]][chainId];
        if (!scwRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }

        const scwConsumer = new SCWConsumer({
          queue: scwQueue,
          relayerManager: scwRelayerManager,
          transactionService,
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
          crossChainTransactionDAO: new CrossChainTransactionDAO(),
          crossChainRetryHandlerQueue: crossChainRetryTransactionQueueMap[chainId],
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

        crossChainGasEstimationServiceMap[chainId] = new CrossChainGasEstimationService(
          chainId,
          sdkBackendService,
          tokenPriceConversionService,
          ccmpRouterMap[chainId],
          gasPriceService,
          config.tokenPrice.symbolMapByChainId,
        );

        ccmpServiceMap[chainId] = new CrossChainTransactionHandlerService(
          chainId,
          ccmpRouterMap[chainId],
          routeTransactionToRelayerMap,
          new CrossChainTransactionDAO(),
          crossChainRetryTransactionQueueMap[chainId],
          ccmpGatewayServiceMap[chainId],
          indexerService,
          crossChainGasEstimationServiceMap,
        );

        ccmpServiceInitPromises.push(ccmpServiceMap[chainId].init());

        crossChainRetryTransactionServiceMap[chainId] = new CrossChainRetryTransactionService(
          chainId,
          crossChainRetryTransactionQueueMap[chainId],
          ccmpServiceMap[chainId],
        );

        await crossChainRetryTransactionQueueMap[chainId].consume(
          crossChainRetryTransactionServiceMap[chainId].onMessageReceived,
        );
      }
    }
  }

  // Wait for CCMP Service to be initialized
  try {
    await Promise.all(ccmpServiceInitPromises);
    log.info('CCMP Services initialized');
  } catch (e) {
    log.error(`Error initializing CCMP Services: ${e}`);
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
  sdkBackendService,
};
