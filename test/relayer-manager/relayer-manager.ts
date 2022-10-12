import { RedisCacheService } from '../../common/cache';
import { TransactionDAO } from '../../common/db';
import { GasPriceManager } from '../../common/gas-price';
import { EVMNetworkService } from '../../common/network';
import { RetryTransactionHandlerQueue, TransactionHandlerQueue } from '../../common/queue';
import { EVMRawTransactionType } from '../../common/types';
import { config } from '../../config';
import { EVMAccount } from '../../relayer/src/services/account';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import { EVMRelayerManager, IRelayerManager } from '../../relayer/src/services/relayer-manager';
import { EVMRelayerQueue } from '../../relayer/src/services/relayer-queue';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';

// test relayer manager
describe('relayer manager', async () => {
  const chainId = 5;

  const EVMRelayerManagerMap: {
    [name: string] : {
      [chainId: number]: IRelayerManager<EVMAccount, EVMRawTransactionType>;
    }
  } = {};

  const cacheService = RedisCacheService.getInstance();

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

  const retryTransactionQueue = new RetryTransactionHandlerQueue({
    chainId,
  });
  await retryTransactionQueue.connect();

  const transactionDao = new TransactionDAO();

  const transactionListener = new EVMTransactionListener({
    networkService,
    transactionQueue,
    retryTransactionQueue,
    transactionDao,
    options: {
      chainId,
    },
  });

  const nonceManager = new EVMNonceManager({
    options: {
      chainId,
    },
    networkService,
    cacheService,
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
});
