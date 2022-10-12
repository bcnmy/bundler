import { RedisCacheService } from '../../common/cache';
import { CMCTokenPriceManager } from '../../common/token-price';
import { config } from '../../config';

describe('get token price', () => {
  const cacheService = RedisCacheService.getInstance();

  const tokenService = new CMCTokenPriceManager(cacheService, {
    apiKey: config.tokenPrice.coinMarketCapApi,
    networkSymbolCategories: config.tokenPrice.networkSymbols,
    updateFrequencyInSeconds: config.tokenPrice.updateFrequencyInSeconds,
    symbolMapByChainId: config.tokenPrice.symbolMapByChainId,
  });
  tokenService.schedule();

  it('should return token price for chain id 5', async () => {
    const tokenPrice = await tokenService.getTokenPrice('ETH');
    expect(tokenPrice).toBeGreaterThan(0);
  });
});
