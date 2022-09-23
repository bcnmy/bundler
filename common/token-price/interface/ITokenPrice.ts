import { NetworkSymbolCategoriesType } from '../types';

export interface ITokenPrice {
  networkSymbolCategories: NetworkSymbolCategoriesType;
  updateFrequencyInSeconds: number;

  getTokenPrice(symbol: string): Promise<number>;
  getTokenPriceByTokenAddress(chainId: number, tokenAddress: string): Promise<number>;
}
