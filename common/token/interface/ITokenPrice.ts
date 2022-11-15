export interface ITokenPrice {
  getTokenPrice(symbol: string): Promise<number>;
  getTokenPriceByTokenSymbol(tokenSymbol: string): Promise<number>;
  getTokenPriceByTokenAddress(chainId: number, tokenAddress: string): Promise<number>;
}
