import { RedisCacheService } from '../../common/cache';
import { GasPriceManager, GasPriceServiceType } from '../../common/gas-price';
import { GasPriceType } from '../../common/gas-price/types';
import { EVMNetworkService } from '../../common/network';
import { config } from '../../config';

const chainId = 80001;

const cacheService = RedisCacheService.getInstance();

const networkServiceMap: {
  [chainId: number]: EVMNetworkService;
} = {};
const gasPriceServiceMap: {
  [chainId: number]: GasPriceServiceType;
} = {};

for (const supportedNetwork of config.supportedNetworks) {
  networkServiceMap[supportedNetwork] = new EVMNetworkService({
    chainId,
    rpcUrl: config.chains.provider[chainId],
    fallbackRpcUrls: config.chains.fallbackUrls[chainId] || [],
  });

  const gasPriceManager = new GasPriceManager(cacheService, networkServiceMap[supportedNetwork], {
    chainId,
    EIP1559SupportedNetworks: config.EIP1559SupportedNetworks,
  });
  gasPriceServiceMap[supportedNetwork] = gasPriceManager.setup();
}

// create test in jest to check if gas price are updating correctly
describe('Gas Price', () => {
  it(`should update gas price in redis for network id ${chainId}`, async () => {
    await gasPriceServiceMap[chainId]?.setGasPrice(GasPriceType.DEFAULT, '1000000000');
  });

  it(`should get gas price from redis for network id ${chainId}`, async () => {
    const gasPrice = gasPriceServiceMap[chainId]?.getGasPrice(GasPriceType.DEFAULT);
    expect(gasPrice).not.toBeNull();
    expect(typeof gasPrice).toBe('string');
    expect(Number(gasPrice)).toBeGreaterThan(0);
    expect(gasPrice).toBe('1000000000');
  });
});
