export interface ILiquidityTokenManagerService {
  getTokenSymbol(tokenSymbol: string): Promise<number>;
}
