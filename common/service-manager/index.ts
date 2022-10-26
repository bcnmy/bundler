/* eslint-disable no-await-in-loop */
import { ethers } from 'ethers';
import { config } from '../../config';
import { EVMAccount } from '../../relayer/src/services/account';
import {
  AAConsumer,
  CCMPConsumer,
  SCWConsumer,
  SocketConsumer,
} from '../../relayer/src/services/consumer';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import { EVMRelayerManager, IRelayerManager } from '../../relayer/src/services/relayer-manager';
import { EVMRelayerQueue } from '../../relayer/src/services/relayer-queue';
import { EVMRetryTransactionService } from '../../relayer/src/services/retry-transaction-service';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';
import { FeeOption } from '../../server/src/services';
import { CCMPService } from '../../server/src/services/ccmp/ccmp-service';
import {
  AxelarRouterService,
  HyperlaneRouterService,
  WormholeRouterService,
} from '../../server/src/services/ccmp/router-service';
import { ICCMPRouterService } from '../../server/src/services/ccmp/types';
import { RedisCacheService } from '../cache';
import { Mongo, TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { logger } from '../log-config';
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
import { CMCTokenPriceManager } from '../token-price';
import {
  AATransactionMessageType,
  CCMPRouterName,
  CCMPTransactionMessageType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionType,
} from '../types';

const log = logger(module);

// change below to assign relayer manager to transaction type
const relayerManagerTransactionTypeNameMap = {
  [TransactionType.AA]: 'RM1',
  [TransactionType.SCW]: 'RM1',
  [TransactionType.CROSS_CHAIN]: 'RM1',
};

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [transactionType: string]: AARelayService | SCWRelayService | CCMPRelayService;
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

const entryPointMap: {
  [chainId: number]: Array<{
    address: string;
    entryPointContract: ethers.Contract;
  }>;
} = {};

const ccmpServiceMap: {
  [chainId: number]: CCMPService;
} = {};

const ccmpRouterMap: {
  [chainId: number]: {
    [key in CCMPRouterName]?: ICCMPRouterService;
  };
} = {};

const ccmpRouterServiceClassMap = {
  [CCMPRouterName.WORMHOLE]: WormholeRouterService,
  [CCMPRouterName.AXELAR]: AxelarRouterService,
  [CCMPRouterName.HYPERLANE]: HyperlaneRouterService,
};

const dbInstance = Mongo.getInstance();
const cacheService = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

const EVMRelayerManagerMap: {
  [name: string]: {
    [chainId: number]: IRelayerManager<EVMAccount, EVMRawTransactionType>;
  };
} = {};

const transactionDao = new TransactionDAO();

const socketConsumerMap: any = {};
const retryTransactionSerivceMap: any = {};
const transactionListenerMap: any = {};
const retryTransactionQueueMap: {
  [key: number]: RetryTransactionHandlerQueue;
} = {};

(async () => {
  await dbInstance.connect();
  await cacheService.connect();

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

    socketConsumerMap[chainId] = new SocketConsumer({
      queue: transactionQueue,
      options: {
        chainId,
        wssUrl: config.socketService.wssUrl,
      },
    });
    transactionQueue.consume(socketConsumerMap[chainId].onMessageReceived);

    const retryTransactionQueue = new RetryTransactionHandlerQueue({
      chainId,
    });
    retryTransactionQueueMap[chainId] = retryTransactionQueue;
    await retryTransactionQueueMap[chainId].connect();

    const nonceManager = new EVMNonceManager({
      options: {
        chainId,
      },
      networkService,
      cacheService,
    });

    const transactionListener = new EVMTransactionListener({
      networkService,
      transactionQueue,
      retryTransactionQueue,
      transactionDao,
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
      options: {
        chainId,
      },
    });

    retryTransactionSerivceMap[chainId] = new EVMRetryTransactionService({
      retryTransactionQueue,
      transactionService,
      networkService,
      options: {
        chainId,
      },
    });
    retryTransactionQueueMap[chainId].consume(
      retryTransactionSerivceMap[chainId].onMessageReceived
    );

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
            relayerManager.ownerAccountDetails[chainId].privateKey
          ),
          gasLimitMap: relayerManager.gasLimitMap,
        },
      });
      EVMRelayerManagerMap[relayerManager.name][chainId] = relayerMangerInstance;

      const addressList = await relayerMangerInstance.createRelayers();
      log.info('Relayer address list length', addressList.length, relayerManager.minRelayerCount);
      await relayerMangerInstance.fundRelayers(addressList);
    }

    const tokenService = new CMCTokenPriceManager(cacheService, {
      apiKey: config.tokenPrice.coinMarketCapApi,
      networkSymbolCategories: config.tokenPrice.networkSymbols,
      updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
      symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
    });
    tokenService.schedule();

    const feeOptionService = new FeeOption(gasPriceService, cacheService, {
      chainId,
    });
    feeOptionMap[chainId] = feeOptionService;
    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      const aaRelayerManager =
        EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][chainId];
      if (!aaRelayerManager) {
        throw new Error(`Relayer manager not found for ${type}`);
      }

      if (type === TransactionType.AA) {
        const aaQueue: IQueue<AATransactionMessageType> = new AATransactionQueue({
          chainId,
        });

        await aaQueue.connect();
        const aaConsumer = new AAConsumer({
          queue: aaQueue,
          relayerManager: aaRelayerManager,
          transactionService,
          options: {
            chainId,
          },
        });
        // start listening for transaction
        await aaQueue.consume(aaConsumer.onMessageReceived);

        const aaRelayService = new AARelayService(aaQueue);
        routeTransactionToRelayerMap[chainId][type] = aaRelayService;

        aaSimulatonServiceMap[chainId] = new AASimulationService(networkService);

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
              entryPoint.address
            ),
          });
        }
      } else if (type === TransactionType.SCW) {
        // queue for scw
        const scwQueue: IQueue<SCWTransactionMessageType> = new SCWTransactionQueue({
          chainId,
        });
        await scwQueue.connect();

        const scwRelayerManager =
          EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][chainId];
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
          tenderlySimulationService
        );
      } else if (type === TransactionType.CROSS_CHAIN) {
        // queue for ccmp
        const ccmpQueue: IQueue<CCMPTransactionMessageType> = new CCMPTransactionQueue({
          chainId,
        });
        await ccmpQueue.connect();

        const ccmpRelayerManager =
          EVMRelayerManagerMap[relayerManagerTransactionTypeNameMap[type]][chainId];
        if (!ccmpRelayerManager) {
          throw new Error(`Relayer manager not found for ${type}`);
        }

        const ccmpConsumer = new CCMPConsumer({
          queue: ccmpQueue,
          relayerManager: ccmpRelayerManager,
          transactionService,
          options: {
            chainId,
          },
        });
        await ccmpQueue.consume(ccmpConsumer.onMessageReceived);

        const ccmpRelayService = new CCMPRelayService(ccmpQueue);
        routeTransactionToRelayerMap[chainId][type] = ccmpRelayService;

        ccmpRouterMap[chainId] = Object.fromEntries(
          config.ccmp.supportedRouters[chainId].map((routerName) => [
            routerName,
            new ccmpRouterServiceClassMap[routerName](chainId, networkService),
          ])
        );

        ccmpServiceMap[chainId] = new CCMPService(
          chainId,
          ccmpRouterMap[chainId],
          routeTransactionToRelayerMap
        );
      }
    }
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
};
