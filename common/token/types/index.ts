import type { BigNumberish } from 'ethers';

export type NetworkSymbolCategoriesType = {
  [key: string]: Array<number>
};

export type TokenAmount = {
  amount: BigNumberish,
  tokenSymbol: string,
  chainId: number,
};
