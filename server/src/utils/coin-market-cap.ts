/* eslint-disable consistent-return */
import rp from 'request-promise';
import { logger } from '../../../common/log-config';
import { config } from '../../config';

const log = logger(module);

const setERC20TokenPrices = async () => {
  try {
    let networkSymbolsCategories = JSON.parse(config.networkSymbolsCategories);
    console.log('networkSymbolsCategories', networkSymbolsCategories);
    if (networkSymbolsCategories) {
      const networkSymbolsCategoriesKeys = Object.keys(networkSymbolsCategories);
      networkSymbolsCategories = networkSymbolsCategoriesKeys.toString();
      const requestOptions = {
        method: 'GET',
        uri: process.env.coinMarketCapApi as string,
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
      console.log('response', response);
      // if (response && response.data) {
      //   const networkKeys = Object.keys(response.data);
      //   if (networkKeys) {
      //     const coinsRateObj: any = {};
      //     networkKeys.forEach((network) => {
      //       const coinNetworkIds = networkSymbolsCategories[chainId];
      //       coinNetworkIds.forEach((networkId: number) => {
      //         coinsRateObj[networkId] = response.data[network].quote.USD.price.toFixed(2);
      //       });
      //     });
      //     return coinsRateObj;
      //   }
      //   log.error('Network keys is not defined while fetching the network prices');
      // } else {
      //   log.info('Response and response.data is not defined');
      // }
    } else {
      log.info('Network Symbol Categories object is not defined');
    }
  } catch (error) {
    log.error(JSON.stringify(error));
    // throw new Error(error);
  }
};

export const initSetERC20TokenPrices = async () => {
  console.log('Inside init');
  setInterval(setERC20TokenPrices, config.erc20TokenGasPriceInterval);
};
