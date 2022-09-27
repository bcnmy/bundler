import axios from 'axios';
import { config } from '../../config';
import { logger } from '../log-config';
import { IScheduler } from '../scheduler';
import { redisClient } from '../service-manager';
import { ITokenPrice } from './interface/ITokenPrice';
import { NetworkSymbolCategoriesType } from './types';

const log = logger(module);

export class CMCTokenPriceManager implements ITokenPrice, IScheduler {
  updateFrequencyInSeconds: number;

  networkSymbolCategories: NetworkSymbolCategoriesType;

  constructor() {
    // network symbol categories to be updated via setter if needed
    this.networkSymbolCategories = config.tokenPrice.networkSymbols;
    this.updateFrequencyInSeconds = config.tokenPrice.updateFrequencyInSeconds;
  }

  schedule() {
    setInterval(this.setup, this.updateFrequencyInSeconds * 1000);
  }

  private async setup() {
    try {
      const networkSymbolsCategoriesKeys = Object.keys(this.networkSymbolCategories);
      const response = await axios.get(`${config.tokenPrice.coinMarketCapApi}?symbol=${networkSymbolsCategoriesKeys.toString()}`, {
        headers: {
          'X-CMC_PRO_API_KEY': config.tokenPrice.coinMarketCapApi,
        },
      });
      if (response && response.data && response.data.data) {
        const networkKeys = Object.keys(response.data.data);
        if (networkKeys) {
          const coinsRateObj: any = {};
          networkKeys.forEach((network: any) => {
            const coinNetworkIds = this.networkSymbolCategories[network];
            if (coinNetworkIds && coinNetworkIds.length) {
              coinNetworkIds.forEach((networkId: number) => {
                coinsRateObj[networkId] = response.data.data[network].quote.USD.price.toFixed(2);
              });
            }
          });
          log.info('Network price data updated in cache');
          await redisClient.set('NETWORK_PRICE_DATA', JSON.stringify(coinsRateObj));
        } else {
          log.error('Network keys is not defined while fetching the network prices');
        }
      } else {
        log.info('Response and response.data is not defined');
      }
    } catch (error) {
      log.error(error);
    }
  }

  async getTokenPrice(symbol: string): Promise<number> {
    let data = JSON.parse(await redisClient.get('NETWORK_PRICE_DATA'));
    if (!data) {
      await this.setup();
      data = JSON.parse(await redisClient.get('NETWORK_PRICE_DATA'));
    }
    return data[symbol];
  }

  async getTokenPriceByTokenAddress(chainId: number, tokenAddress: string): Promise<number> {
    let tokenPrice: number = 0;
    try {
      if (tokenAddress) {
        const tokenSymbol = config.tokenPrice.symbolMapByChainId[chainId][tokenAddress];

        if (tokenSymbol) {
          tokenPrice = await this.getTokenPrice(tokenSymbol);
          log.info(`Token price for ${tokenSymbol} is ${tokenPrice} USD`);
        } else {
          log.error(`Can't get token symbol for token address ${tokenAddress} from config map`);
        }
      } else {
        log.error('Token address is not defined');
      }
    } catch (error) {
      log.error(error);
    }
    return tokenPrice;
  }
}
