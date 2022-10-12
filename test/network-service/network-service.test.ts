/* eslint-disable no-await-in-loop */
import { BigNumber, ethers } from 'ethers';
import { config } from '../../config';
import { EVMNetworkService } from '../../common/network';
import { logger } from '../../common/log-config';

const log = logger(module);

const networkServiceMap: {
  [chainId: number]: EVMNetworkService;
} = {};

for (const supportedNetwork of config.supportedNetworks) {
  networkServiceMap[supportedNetwork] = new EVMNetworkService({
    chainId: supportedNetwork,
    rpcUrl: config.chains.provider[supportedNetwork],
    fallbackRpcUrls: config.chains.fallbackUrls[supportedNetwork] || [],
  });
}

describe('Network Service: Rpc Urls', () => {
  it('Main rpc url should be active for chainId: 5', async () => {
    const blockNumber = await networkServiceMap[5].sendRpcCall('eth_blockNumber', []);
    expect(blockNumber).toBeGreaterThan(0);
  });

  it('Main rpc url should be active for chainId: 80001', async () => {
    const blockNumber = await networkServiceMap[80001].sendRpcCall('eth_blockNumber', []);
    expect(blockNumber).toBeGreaterThan(0);
  });

  it('Fallback urls should be active for chaindId: 5', async () => {
    for (
      let fallBackRpcUrlIndex = 0;
      fallBackRpcUrlIndex < networkServiceMap[5].fallbackRpcUrls.length;
      fallBackRpcUrlIndex += 1
    ) {
      const fallBackRpcUrl = networkServiceMap[5].fallbackRpcUrls[fallBackRpcUrlIndex];
      log.info(`Checking rpcUrl: ${fallBackRpcUrl}`);
      networkServiceMap[5].setActiveRpcUrl(fallBackRpcUrl);
      const blockNumber = await networkServiceMap[5].sendRpcCall('eth_blockNumber', []);
      expect(blockNumber).toBeGreaterThan(0);
    }
  });

  it('Fallback urls should be active for chaindId: 80001', async () => {
    for (
      let fallBackRpcUrlIndex = 0;
      fallBackRpcUrlIndex < networkServiceMap[80001].fallbackRpcUrls.length;
      fallBackRpcUrlIndex += 1
    ) {
      const fallBackRpcUrl = networkServiceMap[80001].fallbackRpcUrls[fallBackRpcUrlIndex];
      log.info(`Checking rpcUrl: ${fallBackRpcUrl}`);
      networkServiceMap[80001].setActiveRpcUrl(fallBackRpcUrl);
      const blockNumber = await networkServiceMap[80001].sendRpcCall('eth_blockNumber', []);
      expect(blockNumber).toBeGreaterThan(0);
    }
  });
});

describe('Network Service: Gas Prices', () => {
  it('Type 0 transaction type gas price is not null/zero for chainId: 5', async () => {
    const gasPrice = networkServiceMap[5].getGasPrice();
    expect(gasPrice).not.toBeNull();
    expect(typeof gasPrice).toBe('string');
    expect(Number(gasPrice)).toBeGreaterThan(0);
  });

  it('Type 0 transaction type gas price is not null/zero for chainId: 80001', async () => {
    const gasPrice = networkServiceMap[80001].getGasPrice();
    expect(gasPrice).not.toBeNull();
    expect(typeof gasPrice).toBe('string');
    expect(Number(gasPrice)).toBeGreaterThan(0);
  });

  it('Type 2 transaction type gas price is not null/zero for chainId: 5', async () => {
    const {
      maxPriorityFeePerGas,
      maxFeePerGas,
    } = await networkServiceMap[5].getEIP1559GasPrice();
    expect(maxPriorityFeePerGas).not.toBeNull();
    expect(typeof maxPriorityFeePerGas).toBe('string');
    expect(Number(maxPriorityFeePerGas)).toBeGreaterThan(0);

    expect(maxFeePerGas).not.toBeNull();
    expect(typeof maxFeePerGas).toBe('string');
    expect(Number(maxFeePerGas)).toBeGreaterThan(0);
  });

  it('Type 2 transaction type gas price is not null/zero for chainId: 80001', async () => {
    const {
      maxPriorityFeePerGas,
      maxFeePerGas,
    } = await networkServiceMap[80001].getEIP1559GasPrice();
    expect(maxPriorityFeePerGas).not.toBeNull();
    expect(typeof maxPriorityFeePerGas).toBe('string');
    expect(Number(maxPriorityFeePerGas)).toBeGreaterThan(0);

    expect(maxFeePerGas).not.toBeNull();
    expect(typeof maxFeePerGas).toBe('string');
    expect(Number(maxFeePerGas)).toBeGreaterThan(0);
  });
});

describe('Network Service: Native Asset Balance', () => {
  it('Fetches the correct native asset balance on chainId: 80001', async () => {
    // test wallet
    const wallet = ethers.Wallet.createRandom();

    // owner address
    const ownerAddressPublicKey = '';
    const ownerAddressPrivateKey = '';
    const ownerWallet = new ethers.Wallet(ownerAddressPrivateKey);

    // transfer 0.00001 native token from main account
    await ownerWallet.sendTransaction({
      to: wallet.address,
      from: ownerWallet.address,
      nonce: networkServiceMap[80001].getNonce(ownerWallet.address),
      gasLimit: 21000,
      gasPrice: BigNumber.from(await networkServiceMap[80001].getGasPrice()),
      value: BigNumber.from('10000000'),
    });

    // check if the getBalance gets 0.00001
    const walletBalance = await networkServiceMap[80001].getBalance(wallet.address);

    expect(walletBalance).not.toBeNull();
    expect(typeof walletBalance).toBe('string');
    expect(walletBalance).toBe('10000000');
  });

  it('Fetches the correct native asset balance on chainId: 5', async () => {
    // create a new eth address
    // transfer 0.00001 native token from main account
    // check if the getBalance gets 0.00001
  });
});

describe('Network Service: Nonce Check', () => {
  it('Check if nonce is correct on chaindId: 80001', async () => {
    // use an address that we now the nonce of
    // then call getNonce() on that address
  });

  it('Check if nonce is correct on chaindId: 5', async () => {
    // create a user address
    // then call getNonce() on that address, nonce should 0
    // do a transaction
    // then call getNonce() on that address, nonce should 1
  });
});

describe('Network Service: Sending Transaction', () => {
  it('Transaction should be sent and confirm on chainId: 80001', async () => {

  });

  it('Transaction should be sent and confirm on chainId: 5', async () => {

  });
});
