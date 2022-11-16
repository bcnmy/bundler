import { ILiquidityTokenManagerService } from './interfaces/ILiquidityTokenManagerService';
import { logger } from '../../common/log-config';
import { config } from '../../config';

const log = logger(module);

export class LiquidityTokenManagerService implements ILiquidityTokenManagerService {
  // eslint-disable-next-line class-methods-use-this
  async getTokenSymbol(tokenSymbol: string): Promise<number> {
    const symbol = config.ccmp.tokenSymbols[tokenSymbol];
    if (!symbol) {
      throw new Error(`Liquidity Pool Token symbol for ${tokenSymbol} not found`);
    }
    log.info(`Liquidity Pool Token symbol for ${tokenSymbol}: ${symbol}`);
    return symbol;
  }
}
