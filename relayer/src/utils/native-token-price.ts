import { config } from '../../config';
import { logger } from '../../log-config';
import { redisClient } from '../db';
import { getNetworkFiatPricingKey } from './cache-utils';

const log = logger(module);

export const getNativeTokenPriceInUSD = async (networkId: number) => {
  try {
    const networkPricesInFiatMap = await redisClient.get(getNetworkFiatPricingKey()) || '';
    const parsedNetworkPricesInFiatMap = JSON.parse(networkPricesInFiatMap);
    const tokenPriceInUSD = parsedNetworkPricesInFiatMap[networkId];
    log.info(`token price of network id ${networkId} is ${tokenPriceInUSD}`);
    return tokenPriceInUSD || 0;
  } catch (error) {
    log.error(error);
    return 0;
  }
};
