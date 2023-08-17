import { RedisCacheService } from '../../../common/cache';
import { CMCTokenPriceManager } from '../../../common/token-price';
import { config } from '../../../config';

// Grab test chain id from environment or default to Goerli
const chainId = process.env.TEST_CHAIN_ID || '5';

describe('get token price', () => {
  const cacheService = RedisCacheService.getInstance();

  const tokenService = new CMCTokenPriceManager(cacheService, {
    apiKey: config.tokenPrice.coinMarketCapApi,
    networkSymbolCategories: config.tokenPrice.networkSymbols,
    updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
    symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
  });

  beforeAll(async () => {
    await cacheService.connect();
  });

  it(`should return token price for chain id ${chainId}`, async () => {
    const tokenPrice = await tokenService.getTokenPrice(chainId);
    expect(typeof tokenPrice).toBe('string');
    expect(Number(tokenPrice)).toBeGreaterThan(0);
  });

  afterAll(async () => {
    await cacheService.close();
  });
});
