import axios from 'axios';
import { schedule } from 'node-cron';
import { ICacheService } from '../cache';
import { logger } from '../log-config';
import { IScheduler } from '../scheduler';
import { SymbolMapByChainIdType } from '../types';
import { getTokenPriceKey, parseError } from '../utils';
import { ITokenPrice } from './interface/ITokenPrice';
import { NetworkSymbolCategoriesType } from './types';

const log = logger(module);

export class CMCTokenPriceManager implements ITokenPrice, IScheduler {
  private apiKey: string;

  private updateFrequencyInSeconds: number;

  private networkSymbolCategories: NetworkSymbolCategoriesType;

  private symbolMapByChainId: SymbolMapByChainIdType;

  cacheService: ICacheService;

  constructor(
    cacheService: ICacheService,
    options: {
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
  }

  schedule() {
    schedule(`*/${this.updateFrequencyInSeconds} * * * * *`, () => {
      this.setup();
    });
  }

  private async setup() {
    try {
      const networkSymbolsCategoriesKeys = Object.keys(this.networkSymbolCategories);
      log.info(`Fetching token prices for ${networkSymbolsCategoriesKeys.join(', ')}`);
      const response = await axios.get(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${networkSymbolsCategoriesKeys.toString()}`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
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
          await this.cacheService.set(getTokenPriceKey(), JSON.stringify(coinsRateObj));
        } else {
          log.error('Network keys is not defined while fetching the network prices');
        }
      } else {
        log.info('Response and response.data is not defined');
      }
    } catch (error) {
      log.error(`Error while fetching the network prices ${parseError(error)}`);
    }
  }

  async getTokenPrice(symbol: string): Promise<number> {
    let rawData = await this.cacheService.get(getTokenPriceKey());
    if (!rawData) {
      await this.setup();
      rawData = await this.cacheService.get(getTokenPriceKey());
    }
    const data = JSON.parse(rawData);
    return data[symbol];
  }

  /**
   * @param chainId
   * @param tokenAddress
   * @returns token price in USD
   */
  async getTokenPriceByTokenAddress(chainId: number, tokenAddress: string) {
    let tokenPrice: number = 0;
    try {
      if (tokenAddress) {
        const tokenSymbol = this.symbolMapByChainId[chainId][tokenAddress];

        if (tokenSymbol) {
          tokenPrice = await this.getTokenPrice(tokenSymbol);
          log.info(`Token price for ${tokenSymbol} is ${tokenPrice} USD`);
        } else {
          log.error(`Can't get token symbol for token address ${tokenAddress} from config map`);
          throw new Error(`Can't get token symbol for token address ${tokenAddress} from config map`);
        }
      } else {
        log.error('Token address is not defined');
        throw new Error('Token address is not defined');
      }
    } catch (error) {
      log.error(error);
      throw error;
    }
    return tokenPrice;
  }
}
