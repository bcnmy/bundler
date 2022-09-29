/* eslint-disable no-await-in-loop */
import { config } from '../../config';
import { AAConsumer, SCWConsumer } from '../../relayer/src/services/consumer';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import { EVMRelayerManager } from '../../relayer/src/services/relayer-manager';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';
import { FeeOption } from '../../server/src/services';
import { RedisCacheService } from '../cache';
import { TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { EVMNetworkService } from '../network';
import {
  AATransactionQueue, RetryTransactionHandlerQueue, SCWTransactionQueue, TransactionHandlerQueue,
} from '../queue';
import { AARelayService, SCWRelayService } from '../relay-service';
import { AASimulationService, SCWSimulationService } from '../simulation';
import { CMCTokenPriceManager } from '../token-price';
import { AATransactionMessageType, SCWTransactionMessageType, TransactionType } from '../types';

// change below to assign relayer manager to transaction type
const relayerManagerTransactionTypeNameMap = {
  [TransactionType.AA]: 'RM1',
  [TransactionType.SCW]: 'RM1',
  [TransactionType.CROSS_CHAIN]: 'RM2',
};

const routeTransactionToRelayerMap: {
  [chainId: number]: {
    [transactionType: string]: AARelayService | SCWRelayService;
  }
} = {};
const feeOptionMap: {
  [chainId: number]: FeeOption;
} = {};
const simulatonServiceMap: {
  [chainId: number]: {
    [transactionType: string]: AASimulationService | SCWSimulationService;
  }
} = {};

const cacheService = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

(async () => {
  const transactionDao = new TransactionDAO();
  for (const chainId of supportedNetworks) {
    routeTransactionToRelayerMap[chainId] = {};
    simulatonServiceMap[chainId] = {};

    const gasPriceManager = new GasPriceManager(cacheService, {
      chainId,
    });
    const gasPriceService = gasPriceManager.setup();
    if (gasPriceService) {
      gasPriceService.schedule();
    }

    const networkService = new EVMNetworkService({
      chainId,
      rpcUrl: config.chains.provider[chainId],
      fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
    });

    const transactionQueue = new TransactionHandlerQueue({
      chainId,
    });
    const retryTransactionQueue = new RetryTransactionHandlerQueue({
      chainId,
    });

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

    const relayerManagers = [];
    for (const relayerManager of config.relayerManagers) {
      const relayerMangerInstance = new EVMRelayerManager({
        networkService,
        gasPriceService,
        transactionService,
        nonceManager,
        options: {
          chainId,
          name: relayerManager.name,
          minRelayerCount: relayerManager.minRelayerCount[chainId],
          maxRelayerCount: relayerManager.maxRelayerCount[chainId],
          inactiveRelayerCountThreshold: relayerManager.inactiveRelayerCountThreshold[chainId],
          pendingTransactionCountThreshold: relayerManager
            .pendingTransactionCountThreshold[chainId],
          newRelayerInstanceCount: relayerManager.newRelayerInstanceCount[chainId],
          fundingBalanceThreshold: relayerManager.fundingBalanceThreshold[chainId],
          fundingRelayerAmount: relayerManager.fundingRelayerAmount[chainId],
          ownerAccountDetails: relayerManager.ownerAccountDetails[chainId],
          gasLimitMap: relayerManager.gasLimitMap,
        },
      });
      relayerManagers.push(relayerMangerInstance);
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

      const aaRelayerManager = relayerManagers.find(
        (relayerManager) => relayerManager.name === relayerManagerTransactionTypeNameMap[type],
      );
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

        const scwRelayerManager = relayerManagers.find(
          (relayerManager) => relayerManager.name === relayerManagerTransactionTypeNameMap[type],
        );
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
})();

export {
  routeTransactionToRelayerMap,
  feeOptionMap,
  simulatonServiceMap,
};
