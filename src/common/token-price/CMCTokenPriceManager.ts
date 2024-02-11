/* eslint-disable import/no-import-module-exports */
import axios from "axios";
import { ICacheService } from "../cache";
import { logger } from "../logger";
import { SymbolMapByChainIdType } from "../types";
import { customJSONStringify, getTokenPriceKey, parseError } from "../utils";
import { ITokenPrice } from "./interface/ITokenPrice";
import { CoinsRateObjType, NetworkSymbolCategoriesType } from "./types";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class CMCTokenPriceManager implements ITokenPrice {
  private apiKey: string;

  private networkSymbolCategories: NetworkSymbolCategoriesType;

  private symbolMapByChainId: SymbolMapByChainIdType;

  cacheService: ICacheService;

  public tokens: string[];

  constructor(
    cacheService: ICacheService,
    options: {
      apiKey: string;
      networkSymbolCategories: NetworkSymbolCategoriesType;
      updateFrequencyInSeconds: number;
      symbolMapByChainId: SymbolMapByChainIdType;
    },
  ) {
    this.apiKey = options.apiKey;
    this.networkSymbolCategories = options.networkSymbolCategories;
    this.symbolMapByChainId = options.symbolMapByChainId;
    this.cacheService = cacheService;

    this.tokens = Object.keys(this.networkSymbolCategories);
  }

  public async setup() {
    try {
      log.info(`Fetching token prices for ${this.tokens.join(", ")}`);
      const response = await axios.get(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${this.tokens.toString()}`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": this.apiKey,
          },
        },
      );

      if (response && response.data && response.data.data) {
        const networkKeys = Object.keys(response.data.data);
        if (networkKeys) {
          const coinsRateObj: CoinsRateObjType = {};
          networkKeys.forEach((network: any) => {
            const coinNetworkIds = this.networkSymbolCategories[network];
            if (coinNetworkIds && coinNetworkIds.length) {
              coinNetworkIds.forEach((networkId: number) => {
                coinsRateObj[networkId] =
                  response.data.data[network].quote.USD.price?.toFixed(2);
              });
            }
          });
          log.info("Network price data updated in cache");
          await this.cacheService.set(
            getTokenPriceKey(),
            customJSONStringify(coinsRateObj),
          );
        } else {
          log.error(
            "Network keys is not defined while fetching the network prices",
          );
        }
      } else {
        log.info("Response and response.data is not defined");
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
  async getTokenPriceByTokenAddress(
    chainId: number,
    tokenAddress: string,
  ): Promise<number> {
    let tokenPrice: number = 0;
    try {
      if (tokenAddress) {
        const tokenSymbol = this.symbolMapByChainId[chainId][tokenAddress];

        if (tokenSymbol) {
          tokenPrice = await this.getTokenPrice(tokenSymbol);
          log.info(`Token price for ${tokenSymbol} is ${tokenPrice} USD`);
        } else {
          log.error(
            `Can't get token symbol for token address ${tokenAddress} from config map`,
          );
          throw new Error(
            `Can't get token symbol for token address ${tokenAddress} from config map`,
          );
        }
      } else {
        log.error("Token address is not defined");
        throw new Error("Token address is not defined");
      }
    } catch (error) {
      log.error(error);
      throw error;
    }
    return tokenPrice;
  }
}
