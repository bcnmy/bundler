/* eslint-disable no-await-in-loop */
// make instance of config and the call setup
// make instance of Mongo
// make instance of Redis Client
// make instance of Redis PubSub
// make instance of Network Manger
// make instance of Gas Price and start updating cache
// make instance of Network Price and start updating cache
// make instance of queue for network id and transaction type - done

import { AAConsumer } from '../../relayer/src/services/consumer/AAConsumer';
import { AATransactionMessageType, TransactionType } from '../types';
import { AATransactionQueue } from '../queue/AATransactionQueue';
import { RedisCacheService } from '../cache';
import { Mongo } from '../db';
import { GasPriceManager } from '../gas-price';
import { AARelayService } from '../relay-service';
import { IQueue } from '../interface';
import { EVMNetworkService } from '../network';
import { config } from '../../config';
import { CMCTokenPriceManager } from '../token-price';

const queueMap: any = {}; // TODO: Add type of queue
const gasPriceMap: any = {}; // TODO: Add type of queue
const relayMap: any = {};

const redisClient = RedisCacheService.getInstance();
const dbInstance = Mongo.getInstance();

const { supportedNetworks, supportedTransactionType } = config;

(async () => {
  for (const chainId of supportedNetworks) {
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

    // for each network get transaction type
    for (const type of supportedTransactionType[chainId]) {
      if (type === TransactionType.AA) {
        const queue: IQueue<AATransactionMessageType> = new AATransactionQueue({
          chainId,
          transactionType: type,
        });
        await queue.connect();
        const aaConsumer = new AAConsumer(queue, {
          chainId,
          transactionType: type,
        });
        // start listening for transaction
        await queue.consume(aaConsumer.onMessageReceived);

        const aaRelayService = new AARelayService(queue);
        relayMap[chainId][type] = aaRelayService;
      }
    }
  }
})();

export {
  queueMap,
  gasPriceMap,
  relayMap,
  redisClient,
  dbInstance,
};
