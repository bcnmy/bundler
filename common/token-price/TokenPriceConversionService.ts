import { BigNumber, ethers } from 'ethers';
import { logger } from '../log-config';
import type { EVMNetworkService } from '../network';
import type { ITokenPriceConversionService } from './interface/ITokenPriceConversionService';
import type { ITokenPrice } from './interface/ITokenPrice';
import type { TokenAmount, NetworkSymbolCategoriesType } from './types';
import type { SymbolMapByChainIdType } from '../types';

const log = logger(module);

export class TokenPriceConversionService implements ITokenPriceConversionService {
  private readonly symbolToTokenAddressMap: Record<number, Record<string, string>>;

  constructor(
    private readonly tokenPriceService: ITokenPrice,
    private readonly networkServiceMap: Record<number, EVMNetworkService>,
    private readonly networkSymbolCategories: NetworkSymbolCategoriesType,
    private readonly symbolMapByChainId: SymbolMapByChainIdType,
  ) {
    this.symbolToTokenAddressMap = Object.fromEntries(
      Object.entries(this.symbolMapByChainId).map((chainId, addressToSymbolMap) => [
        chainId,
        Object.fromEntries(
          Object.entries(addressToSymbolMap).map(([address, symbol]) => [symbol, address]),
        ),
      ]),
    );
  }

  private getNativeTokenSymbol(chainId: number): string {
    log.info(`Getting native token symbol for chainId: ${chainId}`);
    const result = Object.entries(this.networkSymbolCategories).find(
      ([, networkIds]) => networkIds.includes(chainId),
    );
    if (!result) {
      throw new Error(`Native token symbol not found for chainId: ${chainId}`);
    }
    const symbol = result[0];
    log.info(`Native token symbol for chainId: ${chainId} is ${symbol}`);
    return symbol;
  }

  private async getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    log.info(`Getting decimals for token ${tokenSymbol} on chain ${chainId}`);
    let decimals = 18;
    if (this.getNativeTokenSymbol(chainId) !== tokenSymbol) {
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
          const tokenPrice: number = await this.tokenPriceService.getTokenPrice(tokenSymbol);
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
      const tokenPrice = await this.tokenPriceService.getTokenPrice(tokenSymbol);
      const amount = usdValue / tokenPrice;
      const decimals = await this.getTokenDecimals(tokenSymbol, chainId);
      const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);
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
