import { ethers } from 'ethers';
import { RedisCacheService } from '../../common/cache';
import { Mongo, TransactionDAO } from '../../common/db';
import { GasPriceManager } from '../../common/gas-price';
import { EVMNetworkService } from '../../common/network';
import { TransactionHandlerQueue, RetryTransactionHandlerQueue } from '../../common/queue';
import { config } from '../../config';
import { EVMAccount } from '../../relayer/src/services/account';
import { EVMNonceManager } from '../../relayer/src/services/nonce-manager';
import { EVMTransactionListener } from '../../relayer/src/services/transaction-listener';
import { EVMTransactionService } from '../../relayer/src/services/transaction-service';

const dbInstance = Mongo.getInstance();
const transactionDao = new TransactionDAO();
const cacheService = RedisCacheService.getInstance();

describe('Transaction Service: Sending Transaction on chainId: 5', async () => {
  await dbInstance.connect();
  await cacheService.connect();

  const chainId = 5;

  const networkService = new EVMNetworkService({
    chainId,
    rpcUrl: config.chains.provider[chainId],
    fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
  });

  const transactionQueue = new TransactionHandlerQueue({
    chainId,
  });
  await transactionQueue.connect();

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

  const retryTransactionQueue = new RetryTransactionHandlerQueue({
    chainId,
  });
  retryTransactionQueue.connect();

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

  const accountPublicKey = '0x4C07E2fa10f9871142883139B32Cb03F2A180494';
  const accountPrivateKey = 'e3b3818b1b604cf6dfc3133faa9a524f1e2ea0d5894a003c4b857952f6b146f6';
  const evmAccount = new EVMAccount(accountPublicKey, accountPrivateKey);

  const nonceBeforeTransaction = await nonceManager.getNonce(accountPublicKey);

  const setQuoteAbi = [{
    inputs: [{ internalType: 'string', name: 'newQuote', type: 'string' }], name: 'setQuote', outputs: [], stateMutability: 'nonpayable', type: 'function',
  }, { inputs: [], stateMutability: 'nonpayable', type: 'constructor' }, {
    inputs: [], name: 'admin', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
  }, {
    inputs: [], name: 'getQuote', outputs: [{ internalType: 'string', name: 'currentQuote', type: 'string' }, { internalType: 'address', name: 'currentOwner', type: 'address' }], stateMutability: 'view', type: 'function',
  }, {
    inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
  }, {
    inputs: [], name: 'quote', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
  }];
  const setQuoteAddress = '0xe31b0bcbda693bff2529f4a1d9f7e8f6d924c6ab';

  const setQuoteContract = networkService.getContract(setQuoteAbi.toString(), setQuoteAddress);

  const { data } = await setQuoteContract.populateTransaction.setQuote(`Current time: ${Date.now()}`);

  const transactionData = {
    to: accountPublicKey,
    value: '0x0',
    data: data as string,
    gasLimit: '0x249F0',
    transactionId: '0xabcdefg',
  };
  const { transactionExecutionResponse } = await transactionService.sendTransaction(
    transactionData,
    evmAccount,
  );

  it('Transaction hash is generated', async () => {
    expect((transactionExecutionResponse as ethers.providers.TransactionResponse).hash)
      .not.toBeNull();
    expect((transactionExecutionResponse as ethers.providers.TransactionResponse).hash).toBe('string');
  });

  it('Nonce should have been incremented by 1', async () => {
    const nonceAfterTransaction = await nonceManager.getNonce(accountPublicKey);
    const nonceDifference = nonceAfterTransaction - nonceBeforeTransaction;
    expect(nonceDifference).toBe(1);
  });
});
