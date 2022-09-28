/* eslint-disable no-await-in-loop */
import { config } from '../../config';
import { AAConsumer, SCWConsumer } from '../../relayer/src/services/consumer';
import { FeeOption } from '../../server/src/services';
import { RedisCacheService } from '../cache';
import { Mongo } from '../db';
import { GasPriceManager } from '../gas-price';
import { IQueue } from '../interface';
import { EVMNetworkService } from '../network';
import { AATransactionQueue, SCWTransactionQueue } from '../queue';
import { AARelayService } from '../relay-service';
import { AASimulationService, SCWSimulationService } from '../simulation';
import { CMCTokenPriceManager } from '../token-price';
import { AATransactionMessageType, SCWTransactionMessageType, TransactionType } from '../types';

const relayMap: any = {};
const feeOptionMap: any = {};
const simulatonServiceMap: any = {};

const redisClient = RedisCacheService.getInstance();
const dbInstance = Mongo.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

(async () => {
  for (const chainId of supportedNetworks) {
    relayMap[chainId] = {};
    simulatonServiceMap[chainId] = {};
    feeOptionMap[chainId] = {};

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
        const queue: IQueue<SCWTransactionMessageType> = new SCWTransactionQueue({
          chainId,
        });
        await queue.connect();
        const scwConsumer = new SCWConsumer(queue, {
          chainId,
        });
        await queue.consume(scwConsumer.onMessageReceived);

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
  dbInstance,
  redisClient,
  relayMap,
  feeOptionMap,
  simulatonServiceMap,
};
