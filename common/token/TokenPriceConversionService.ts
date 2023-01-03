import { BigNumber, ethers } from 'ethers';
import Decimal from 'decimal.js';
import { logger } from '../log-config';
import { getNativeTokenSymbol } from './utils';
import type { EVMNetworkService } from '../network';
import type { ITokenPriceConversionService } from './interface/ITokenPriceConversionService';
import type { ITokenPrice } from './interface/ITokenPrice';
import type { TokenAmount } from './types';
import type { SymbolMapByChainIdType } from '../types';

const log = logger(module);

export class TokenPriceConversionService implements ITokenPriceConversionService {
  private readonly symbolToTokenAddressMap: Record<number, Record<string, string>>;

  constructor(
    private readonly tokenPriceService: ITokenPrice,
    private readonly networkServiceMap: Record<number, EVMNetworkService>,
    private readonly symbolMapByChainId: SymbolMapByChainIdType,
  ) {
    this.symbolToTokenAddressMap = Object.fromEntries(
      Object.entries(this.symbolMapByChainId).map(([chainId, symbolToAddressMap]) => [
        chainId,
        Object.fromEntries(
          Object.entries(symbolToAddressMap).map(([symbol, address]) => [
            symbol,
            // Convert addresses to lowercase
            address.toLowerCase(),
          ]),
        ),
      ]),
    );
  }

  private async getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    log.info(`Getting decimals for token ${tokenSymbol} on chain ${chainId}`);
    let decimals = 18;
    if (getNativeTokenSymbol(chainId) !== tokenSymbol) {
      const networkService = this.networkServiceMap[chainId];
      if (!networkService) {
        throw new Error(`Network service not found for chainId: ${chainId}`);
      }
      const tokenAddress = this.symbolToTokenAddressMap[chainId][tokenSymbol];
      if (!tokenAddress) {
        throw new Error(
          `Token address not found for chainId: ${chainId} and tokenSymbol: ${tokenSymbol}`,
        );
      }
      log.info(`Getting decimals for token ${chainId} at ${tokenAddress} on chain ${chainId}`);
      decimals = await networkService.getDecimal(tokenAddress);
      log.info(`Decimals for token ${chainId} at ${tokenAddress} on chain ${chainId}: ${decimals}`);
    } else {
      log.info(`Using Native Token Decimals (18) for ${tokenSymbol} on ${chainId}`);
    }
    return decimals;
  }

  async getUSDValue(amounts: TokenAmount[]): Promise<number> {
    const tokenPricesInUSD = await Promise.all(
      amounts.map(async ({ chainId, tokenSymbol, amount }) => {
        try {
          // Get Token Decimals
          const decimals = await this.getTokenDecimals(tokenSymbol, chainId);

          // Get Amount
          const readableAmount = parseFloat(ethers.utils.formatUnits(amount, decimals));
          log.info(`Readable Amount for ${tokenSymbol} on ${chainId}: ${readableAmount}`);

          // Get Token Price
          const tokenPrice: number = await this.tokenPriceService.getTokenPriceByTokenSymbol(
            tokenSymbol,
          );
          log.info(`Token Price for ${tokenSymbol} on ${chainId}: ${tokenPrice}`);
          if (!tokenPrice) {
            throw new Error(`Token Price not found for ${tokenSymbol} on ${chainId}`);
          }

          // Calculate USD Value
          const usdValue = readableAmount * tokenPrice;
          log.info(`USD Value for ${tokenSymbol} on ${chainId}: ${usdValue}`);
          return usdValue;
        } catch (e) {
          log.error(`Error while getting decimals for ${tokenSymbol} on ${chainId}: ${e}`);
          return 0;
        }
      }),
    );

    const totalUSDValue = tokenPricesInUSD.reduce((acc, curr) => acc + curr, 0);
    log.info(`Total USD Value: ${totalUSDValue}`);
    return totalUSDValue;
  }

  async getEquivalentTokenAmount(
    amounts: TokenAmount[],
    chainId: number,
    tokenSymbol: string,
  ): Promise<BigNumber> {
    try {
      const usdValue = await this.getUSDValue(amounts);
      const tokenPrice = await this.tokenPriceService.getTokenPriceByTokenSymbol(tokenSymbol);
      const amount = usdValue / tokenPrice;
      const decimals = await this.getTokenDecimals(tokenSymbol, chainId);
      const amountInWei = ethers.BigNumber.from(
        new Decimal(amount).mul(new Decimal(10).pow(decimals)).floor().toString(),
      );
      log.info(
        `Equivalent Token Amount for ${tokenSymbol} on ${chainId}: ${amountInWei.toString()}`,
      );
      return amountInWei;
    } catch (e) {
      log.error(
        `Error while getting equivalent token amount for ${tokenSymbol} on ${chainId}: ${e}`,
      );
      throw e;
    }
  }
}
