/* eslint-disable no-await-in-loop */
import { config } from '../../config';
import { AAConsumer, SCWConsumer } from '../../relayer/src/services/consumer';
import { EVMRelayerManager } from '../../relayer/src/services/relayer-manager/EVMRelayerManager';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';
import { FeeOption } from '../../server/src/services';
import { RedisCacheService } from '../cache';
import { Mongo, TransactionDAO } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { EVMNetworkService } from '../network';
import { AATransactionQueue, SCWTransactionQueue } from '../queue';
import { AARelayService, SCWRelayService } from '../relay-service';
import { AASimulationService, SCWSimulationService } from '../simulation';
import { CMCTokenPriceManager } from '../token-price';
import { AATransactionMessageType, SCWTransactionMessageType, TransactionType } from '../types';

const relayMap: {
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

const redisClient = RedisCacheService.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

(async () => {
  const transactionDao = new TransactionDAO();
  for (const chainId of supportedNetworks) {
    relayMap[chainId] = {};
    simulatonServiceMap[chainId] = {};

    const gasPriceManager = new GasPriceManager(redisClient, {
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

    const transactionQueue = new 

    const transactionListener = new EVMTransactionListener({
      networkService,
      queue: transactionQueue,
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
    for (const relayerManager of config.relayerManager) {
      const relayerMangerInstance = new EVMRelayerManager({
        networkService,
        gasPriceService,
        transactionService,
        nonceManagerService,
        options: {
          chainId,
        },
      });
    }

    const tokenService = new CMCTokenPriceManager(redisClient, {
      apiKey: config.tokenPrice.coinMarketCapApi,
      networkSymbolCategories: config.tokenPrice.networkSymbols,
      updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
      symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
    });
    tokenService.schedule();

    const feeOptionService = new FeeOption(gasPriceService, redisClient, {
      chainId,
    });
    feeOptionMap[chainId] = feeOptionService;
    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      const { entryPointData } = config;
      const entryPointAbi = entryPointData.abi;
      const entryPointAddress = entryPointData.address[chainId];

      if (type === TransactionType.AA) {
        const aaQueue: IQueue<AATransactionMessageType> = new AATransactionQueue({
          chainId,
        });
        await aaQueue.connect();
        const aaConsumer = new AAConsumer(aaQueue, {
          chainId,
        });
        // start listening for transaction
        await aaQueue.consume(aaConsumer.onMessageReceived);

        const aaRelayService = new AARelayService(aaQueue);
        relayMap[chainId][type] = aaRelayService;

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
        const scwConsumer = new SCWConsumer(scwQueue, {
          chainId,
        });
        await scwQueue.consume(scwConsumer.onMessageReceived);

        const scwRelayService = new SCWRelayService(scwQueue);
        relayMap[chainId][type] = scwRelayService;

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
  redisClient,
  relayMap,
  feeOptionMap,
  simulatonServiceMap,
};
