import type { BigNumber } from 'ethers';
import { TokenAmount } from '../types';

export interface ITokenPriceConversionService {
  getUSDValue(amounts: TokenAmount[]): Promise<number>;
  getEquivalentTokenAmount: (
    amounts: TokenAmount[],
    chainId: number,
    tokenSymbol: string
  ) => Promise<BigNumber>;
}