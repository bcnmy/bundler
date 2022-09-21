import { NetworkSymbolCategoriesType } from '../types';

export interface ITokenPrice {
  networkSymbolCategories: NetworkSymbolCategoriesType;
  updateFrequencyInSeconds: number;
}
