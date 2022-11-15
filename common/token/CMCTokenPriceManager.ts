import axios, { AxiosInstance } from 'axios';
import { SymbolMapByChainIdType } from '../types';
import { ICacheService } from '../cache';
import { logger } from '../log-config';
import { IScheduler } from '../scheduler';
import { ITokenPrice } from './interface/ITokenPrice';
import { NetworkSymbolCategoriesType } from './types';

const log = logger(module);

export class CMCTokenPriceManager implements ITokenPrice, IScheduler {
  private apiKey: string;

  private updateFrequencyInSeconds: number;

  private networkSymbolCategories: NetworkSymbolCategoriesType;

  private symbolMapByChainId: SymbolMapByChainIdType;

  private axios: AxiosInstance;

  cacheService: ICacheService;

  constructor(
    cacheService: ICacheService,
    options: {
      baseURL: string,
      apiKey: string,
      networkSymbolCategories: NetworkSymbolCategoriesType,
      updateFrequencyInSeconds: number,
      symbolMapByChainId: SymbolMapByChainIdType,
    },
  ) {
    this.apiKey = options.apiKey;
    this.networkSymbolCategories = options.networkSymbolCategories;
    this.updateFrequencyInSeconds = options.updateFrequencyInSeconds;
    this.symbolMapByChainId = options.symbolMapByChainId;
    this.cacheService = cacheService;

    if (!options.baseURL) {
      throw new Error('CoinMarketCap baseURL is not defined');
    }

    this.axios = axios.create({
      baseURL: options.baseURL,
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
      },
    });
  }

  schedule() {
    setInterval(this.setup, this.updateFrequencyInSeconds * 1000);
  }

  private async setup() {
    try {
      const networkSymbolsCategoriesKeys = Object.keys(this.networkSymbolCategories);
      const response = await this.axios.get(`v1/cryptocurrency/quotes/latest?symbol=${networkSymbolsCategoriesKeys.toString()}`);
      if (response?.data?.data) {
        // Set Network Wise Price Data
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
          await this.cacheService.set('NETWORK_PRICE_DATA', JSON.stringify(coinsRateObj));
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

  async getTokenPriceByTokenSymbol(tokenSymbol: string): Promise<number> {
    const symbol = (this.networkSymbolCategories[tokenSymbol] || [])[0];
    if (!symbol) {
      throw new Error(`Can't get coinmarketcap symbol for token symbol ${tokenSymbol} from config map`);
    }

    return this.getTokenPrice(symbol.toString());
  }

  async getTokenPrice(symbol: string): Promise<number> {
    let data = await this.cacheService.get('NETWORK_PRICE_DATA');
    if (!data) {
      await this.setup();
      data = await this.cacheService.get('NETWORK_PRICE_DATA');
    }
    const result = JSON.parse(await this.cacheService.get('NETWORK_PRICE_DATA'));
    return result[symbol];
  }

  async getTokenPriceByTokenAddress(chainId: number, tokenAddress: string): Promise<number> {
    let tokenPrice: number = 0;
    try {
      if (tokenAddress) {
        const tokenSymbol = this.symbolMapByChainId[chainId][tokenAddress];

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
