import { logger } from '../log-config';
import { config } from '../../config';

const log = logger(module);

export const getNativeTokenSymbol = (chainId: number): string => {
  log.info(`Getting native token symbol for chainId: ${chainId}`);
  const predicate = ([, networkIds]: [any, Array<number>]) => networkIds.includes(chainId);
  const result = Object.entries(config.tokenPrice.networkSymbols).find(predicate);
  if (!result) {
    throw new Error(`Native token symbol not found for chainId: ${chainId}`);
  }
  const symbol = result[0];
  log.info(`Native token symbol for chainId: ${chainId} is ${symbol}`);
  return symbol;
};
