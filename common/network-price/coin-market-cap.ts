/* eslint-disable consistent-return */
import axios from 'axios';
import { logger } from '../log-config';
import { config, redisClient } from '../service-manager';

const log = logger(module);

const setERC20TokenPrices = async () => {
  try {
    const { networkSymbolsCategories } = config;
    if (networkSymbolsCategories) {
      const networkSymbolsCategoriesKeys = Object.keys(networkSymbolsCategories);

      const response = await axios.get(`${config.coinMarketCapApiUrl}?symbol=${networkSymbolsCategoriesKeys.toString()}`, {
        headers: {
          'X-CMC_PRO_API_KEY': config.coinMarketCapApiKey,
        },
      });

      if (response && response.data && response.data.data) {
        const networkKeys = Object.keys(response.data.data);

        if (networkKeys) {
          const coinsRateObj: any = {};
          networkKeys.forEach((network: any) => {
            const coinNetworkIds = networkSymbolsCategories[network];

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
    } else {
      log.info('Network Symbol Categories object is not defined');
    }
  } catch (error) {
    log.error(error);
  }
};

export const initSetERC20TokenPrices = async () => {
  setInterval(setERC20TokenPrices, config.erc20TokenGasPriceInterval);
};
