/* eslint-disable no-await-in-loop */
import { BigNumber, ethers } from 'ethers';
import { config } from '../../../config';
import { EVMNetworkService } from '../../../common/network';
import { logger } from '../../../common/log-config';
import { EVMAccount } from '../../../relayer/src/services/account';

// Grab test chain id from environment or default to Goerli
const chainId = parseInt(process.env.TEST_CHAIN_ID || '5');
const log = logger(module);

const networkServiceMap: {
  [chainId: number]: EVMNetworkService;
} = {};

for (const supportedNetwork of config.supportedNetworks) {
  const service = new EVMNetworkService({
    chainId: supportedNetwork,
    rpcUrl: config.chains.provider[supportedNetwork],
    fallbackRpcUrls: config.chains.fallbackUrls[supportedNetwork] || [],
  });

  describe('Network Service: Rpc Urls', () => {
    it(`Main rpc url should be active for chainId: ${supportedNetwork}`, async () => {
      const { data } = await service.sendRpcCall('eth_blockNumber', []);
      const blockNumber = Number(BigNumber.from(data.result));
      expect(blockNumber).toBeGreaterThan(0);
    });

    it(`Fallback urls should be active for chainId: ${supportedNetwork}`, async () => {
      for (
        let fallBackRpcUrlIndex = 0;
        fallBackRpcUrlIndex < service.fallbackRpcUrls.length;
        fallBackRpcUrlIndex += 1
      ) {
        const fallBackRpcUrl = service.fallbackRpcUrls[fallBackRpcUrlIndex];
        log.info(`Checking rpcUrl: ${fallBackRpcUrl}`);
        service.setActiveRpcUrl(fallBackRpcUrl);
        const { data } = await service.sendRpcCall('eth_blockNumber', []);
        const blockNumber = Number(BigNumber.from(data.result));
        expect(blockNumber).toBeGreaterThan(0);
      }
    });
  });

  describe('Network Service: Gas Prices', () => {
    it(`Type 0 transaction type gas price is not null/zero for chainId: ${supportedNetwork}`, async () => {
      const { gasPrice } = await service.getGasPrice();
      expect(gasPrice).not.toBeNull();
      expect(typeof gasPrice).toBe('string');
      expect(Number(gasPrice)).toBeGreaterThan(0);
    });

    it(`Type 2 transaction type gas price is not null/zero for chainId: ${supportedNetwork}`, async () => {
      const {
        maxPriorityFeePerGas,
        maxFeePerGas,
      } = await service.getEIP1559GasPrice();
      expect(maxPriorityFeePerGas).not.toBeNull();
      expect(typeof maxPriorityFeePerGas).toBe('string');
      expect(Number(maxPriorityFeePerGas)).toBeGreaterThan(0);

      expect(maxFeePerGas).not.toBeNull();
      expect(typeof maxFeePerGas).toBe('string');
      expect(Number(maxFeePerGas)).toBeGreaterThan(0);
    });
  });

  describe('Network Service: Native Asset Balance', () => {
    it(`Fetches the correct native asset balance on chainId: ${supportedNetwork}`, async () => {
      // test wallet
      const wallet = ethers.Wallet.createRandom();

      // owner address
      // const ownerAddressPublicKey = '0x4C07E2fa10f9871142883139B32Cb03F2A180494';
      const ownerAddressPrivateKey = 'e3b3818b1b604cf6dfc3133faa9a524f1e2ea0d5894a003c4b857952f6b146f6';
      const ownerWallet = new ethers.Wallet(
        ownerAddressPrivateKey,
        service.ethersProvider,
      );
      const { gasPrice } = await service.getGasPrice();

      // transfer 0.00001 native token from main account
      const transactionResponse = await ownerWallet.sendTransaction({
        to: wallet.address,
        from: ownerWallet.address,
        nonce: service.getNonce(ownerWallet.address),
        gasLimit: 21000,
        gasPrice,
        value: BigNumber.from('10000000'),
      });

      await service.waitForTransaction(transactionResponse.hash);

      // check if the getBalance gets 0.00001
      const walletBalance = Number(await service.getBalance(wallet.address));
      expect(walletBalance).not.toBeNull();
      expect(typeof walletBalance).toBe('number');
      expect(walletBalance).toBe(10000000);
    });
  });

  describe('Network Service: Nonce Check', () => {
    it(`Check if nonce is correctly incremented on chainId: ${supportedNetwork}`, async () => {
      // call getNonce() on an address, nonce should x

      // owner address
      const ownerAddressPublicKey = '0x4C07E2fa10f9871142883139B32Cb03F2A180494';
      const ownerAddressPrivateKey = 'e3b3818b1b604cf6dfc3133faa9a524f1e2ea0d5894a003c4b857952f6b146f6';
      const ownerWallet = new ethers.Wallet(
        ownerAddressPrivateKey,
        service.ethersProvider,
      );

      const nonceBeforeTransaction = await service.getNonce(ownerAddressPublicKey);
      const { gasPrice } = await service.getGasPrice();

      // do a transaction
      // transfer 0.00001 native token from main account
      await ownerWallet.sendTransaction({
        to: ownerAddressPublicKey,
        from: ownerAddressPublicKey,
        nonce: service.getNonce(ownerAddressPublicKey),
        gasLimit: 21000,
        gasPrice,
        value: BigNumber.from('10000000'),
      });

      // then call getNonce() on that address, nonce should x + 1
      const nonceAfterTransaction = await service.getNonce(ownerAddressPublicKey);
      const nonceDifference = nonceAfterTransaction - nonceBeforeTransaction;
      expect(nonceDifference).toBe(1);
    });
  });

  describe('Network Service: Sending Transaction', () => {
    it(`Transaction should be sent and confirm on chainId: ${supportedNetwork}`, async () => {
      const wallet = ethers.Wallet.createRandom();

      // owner address
      const ownerAddressPublicKey = '0x4C07E2fa10f9871142883139B32Cb03F2A180494';
      const ownerAddressPrivateKey = 'e3b3818b1b604cf6dfc3133faa9a524f1e2ea0d5894a003c4b857952f6b146f6';
      
      const evmAccount = new EVMAccount(ownerAddressPublicKey, ownerAddressPrivateKey);

      const { gasPrice } = await service.getGasPrice();
      const nonce = await service.getNonce(ownerAddressPublicKey);

      const rawTransactionData = {
        from: ownerAddressPublicKey,
        gasPrice,
        data: '0x',
        gasLimit: '0x989680',
        to: wallet.address,
        value: '0x989680',
        chainId: supportedNetwork,
        nonce,
      };

      const transactionExecutionResponse = await service
        .sendTransaction(rawTransactionData, evmAccount);

      const { hash } = transactionExecutionResponse;

      const transactionReceipt = await service.waitForTransaction(hash);
      console.log(transactionReceipt);
      expect(transactionReceipt).not.toBeNull();
      expect(transactionReceipt.status).toBe(1);
    });
  });
}
