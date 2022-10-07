/* eslint-disable no-await-in-loop */
import { config } from '../../config';
import { EVMAccount } from '../../relayer/src/services/account';
import { AAConsumer, SCWConsumer, SocketConsumer } from '../../relayer/src/services/consumer';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import {
  EVMRelayerManager,
  IRelayerManager,
} from '../../relayer/src/services/relayer-manager';
import { EVMRelayerQueue } from '../../relayer/src/services/relayer-queue';
import { EVMRetryTransactionService } from '../../relayer/src/services/retry-transaction-service';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';
import { FeeOption } from '../../server/src/services';
import { RedisCacheService } from '../cache';
import { Mongo, TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { EVMNetworkService } from '../network';
import {
  AATransactionQueue,
  RetryTransactionHandlerQueue,
  SCWTransactionQueue,
  TransactionHandlerQueue,
} from '../queue';
import { AARelayService, SCWRelayService } from '../relay-service';
import { AASimulationService, SCWSimulationService } from '../simulation';
import { CMCTokenPriceManager } from '../token-price';
import {
  AATransactionMessageType,
  EVMRawTransactionType,
  SCWTransactionMessageType,
  TransactionType,
} from '../types';

// change below to assign relayer manager to transaction type
const relayerManagerTransactionTypeNameMap = {
  [TransactionType.AA]: 'RM1',
  [TransactionType.SCW]: 'RM1',
  [TransactionType.CROSS_CHAIN]: 'RM2',
};

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [transactionType: string]: AARelayService | SCWRelayService;
  };
} = {};
const feeOptionMap: {
  [chainId: number]: FeeOption;
} = {};
const simulatonServiceMap: {
  [chainId: number]: {
    [transactionType: string]: AASimulationService | SCWSimulationService;
  };
} = {};

const dbInstance = Mongo.getInstance();
const cacheService = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

const EVMRelayerManagerMap: {
  [name: string] : {
    [chainId: number]: IRelayerManager<EVMAccount, EVMRawTransactionType>;
  }
} = {};

const transactionDao = new TransactionDAO();

(async () => {
  await dbInstance.connect();
  await cacheService.connect();

  for (const chainId of supportedNetworks) {
    routeTransactionToRelayerMap[chainId] = {};
    simulatonServiceMap[chainId] = {};

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

    const transactionQueue = new TransactionHandlerQueue({
      chainId,
    });
    await transactionQueue.connect();

    const socketConsumer = new SocketConsumer({
      queue: transactionQueue,
      options: {
        chainId,
        wssUrl: config.socketService.wssUrl,
      },
    });
    transactionQueue.consume(socketConsumer.onMessageReceived);

    const retryTransactionQueue = new RetryTransactionHandlerQueue({
      chainId,
    });
    await retryTransactionQueue.connect();

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

    const retryTransactionSerivce = new EVMRetryTransactionService({
      transactionService,
      networkService,
      options: {
        chainId,
      },
    });
    retryTransactionQueue.consume(retryTransactionSerivce.onMessageReceived);

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
          inactiveRelayerCountThreshold:
            relayerManager.inactiveRelayerCountThreshold[chainId],
          pendingTransactionCountThreshold:
            relayerManager.pendingTransactionCountThreshold[chainId],
          newRelayerInstanceCount:
            relayerManager.newRelayerInstanceCount[chainId],
          fundingBalanceThreshold:
            relayerManager.fundingBalanceThreshold[chainId],
          fundingRelayerAmount: relayerManager.fundingRelayerAmount[chainId],
          ownerAccountDetails: new EVMAccount(
            relayerManager.ownerAccountDetails[chainId].publicKey,
            relayerManager.ownerAccountDetails[chainId].privateKey,
          ),
          gasLimitMap: relayerManager.gasLimitMap,
        },
      });
      EVMRelayerManagerMap[relayerManager.name][chainId] = relayerMangerInstance;
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
      const { entryPointData } = config;
      const entryPointAbi = entryPointData.abi;
      const entryPointAddress = entryPointData.address[chainId];

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

        simulatonServiceMap[chainId][type] = new AASimulationService(
          networkService,
          {
            entryPointAbi,
            entryPointAddress,
          },
        );
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

        simulatonServiceMap[chainId][type] = new SCWSimulationService(
          networkService,
          {
            entryPointAbi,
            entryPointAddress,
          },
        );
      }
    }
  }
  for (const relayerManagerName of Object.keys(EVMRelayerManagerMap)) {
    for (const chainId of supportedNetworks) {
      const relayerManager = EVMRelayerManagerMap[relayerManagerName][chainId];
      if (relayerManager) {
        const addressList = await relayerManager.createRelayers();
        console.log('Relayer address list length', addressList.length, relayerManager.minRelayerCount);
        await relayerManager.fundRelayers(addressList);
      }
    }
  }
})();

export {
  routeTransactionToRelayerMap,
  feeOptionMap,
  simulatonServiceMap,
  EVMRelayerManagerMap,
};
