import rp from 'request-promise';
import { logger } from '../../../common/log-config';

const log = logger(module);

export const getNetworkPrices = async (chainId: number) => {
  try {
    let networkSymbolsCategories = JSON.parse(process.env.networkSymbolsCategories as string);
    if (networkSymbolsCategories) {
      const networkSymbolsCategoriesKeys = Object.keys(networkSymbolsCategories);
      networkSymbolsCategories = networkSymbolsCategoriesKeys.toString();
      const requestOptions = {
        method: 'GET',
        uri: process.env.coinMarketCapApi,
        qs: {
          symbol: networkSymbolsCategories,
          convert: 'USD',
        },
        headers: {
          'X-CMC_PRO_API_KEY': process.env.coinsrate_api_key,
        },
        json: true,
        gzip: true,
      };

      const response = await rp(requestOptions);
      if (response && response.data) {
        const networkKeys = Object.keys(response.data);
        if (networkKeys) {
          const coinsRateObj: any = {};
          networkKeys.forEach((network) => {
            const coinNetworkIds = networkSymbolsCategories[chainId];
            coinNetworkIds.forEach((networkId: number) => {
              coinsRateObj[networkId] = response.data[network].quote.USD.price.toFixed(2);
            });
          });
          return coinsRateObj;
        }
        log.error('Network keys is not defined while fetching the network prices');
      } else {
        log.info('Response and response.data is not defined');
      }
    } else {
      log.info('Network Symbol Categories object is not defined');
    }
  } catch (error) {
    log.error(JSON.stringify(error));
    throw new Error(error);
  }
};
