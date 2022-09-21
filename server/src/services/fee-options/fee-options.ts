/* eslint-disable no-await-in-loop */
import Big from 'big.js';
import { GasPriceType } from '../../../../common/gas-price/types';
import { logger } from '../../../../common/log-config';
import { config, redisClient, gasPriceMap } from '../../../../common/service-manager';
import { FeeOptionResponseParams } from './types';

const log = logger(module);

const convertGasPriceToUSD = async (
  nativeChainId: number,
  gasPrice: number,
  chainPriceDataInUSD: number,
  token: string,
) => {
  const decimal = config?.chains.decimal[nativeChainId] || 18;
  const offset = config?.feeOption.offset[token] || 1;
  const usdc = new Big(gasPrice)
    .mul(new Big(chainPriceDataInUSD))
    .div(new Big(10 ** decimal))
    .mul(new Big(offset))
    .toString();
  return usdc;
};

export class FeeOption {
  chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  static getNetworkPriceDataKey() {
    return 'NETWORK_PRICE_DATA';
  }

  async get() {
    const response: Array<FeeOptionResponseParams> = [];

    try {
      const feeTokens = config?.feeOption.supportedFeeTokens[this.chainId] || [];
      const gasPriceInString: string = await gasPriceMap[this.chainId].getGasPrice(
        GasPriceType.DEFAULT,
      );

      const gasPrice = Number(gasPriceInString);

      const networkPriceDataInString = await redisClient.get(FeeOption.getNetworkPriceDataKey());
      const networkPriceData = JSON.parse(networkPriceDataInString);
      const chainPriceDataInUSD = networkPriceData[this.chainId];

      for (const token of feeTokens) {
        let tokenGasPrice;
        let decimal;
        if (config?.feeOption.similarTokens[this.chainId].includes(token)) { // check if same token
          tokenGasPrice = gasPrice;
          decimal = config.chains.decimal[this.chainId];
        } else if (token === 'USDC' || token === 'USDT') {
          decimal = 6; // fetch it from contract
          tokenGasPrice = await convertGasPriceToUSD(
            this.chainId,
            gasPrice,
            chainPriceDataInUSD,
            token,
          );
          tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
        } else if (token === 'XDAI') {
          decimal = 18; // fetch it from contract
          tokenGasPrice = await convertGasPriceToUSD(
            this.chainId,
            gasPrice,
            chainPriceDataInUSD,
            token,
          );
          tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
        } else {
          // calculate for cross chain
          const crossChainId = config?.feeOption.wrappedTokens[token];
          if (crossChainId) {
            const gasPriceInUSD = await convertGasPriceToUSD(
              this.chainId,
              gasPrice,
              chainPriceDataInUSD,
              token,
            );
            const crossChainPrice = networkPriceData[crossChainId];
            tokenGasPrice = new Big(gasPriceInUSD).div(new Big(crossChainPrice));
            decimal = config?.chains.decimal[crossChainId] || 1;
            tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
          }
        }
        response.push({
          tokenGasPrice: Number(tokenGasPrice),
          symbol: token,
          address: config.feeOption.tokenContractAddress[this.chainId][token] || '',
          decimal: Number(decimal),
          logoUrl: config?.feeOption.logoUrl[token] || '',
          offset: config?.feeOption.offset[token] || 1,
          feeTokenTransferGas: config?.feeOption.feeTokenTransferGas[this.chainId][token] || 0,
        });
      }
      return {
        response,
      };
    } catch (error) {
      log.info(error);
      return {
        code: 500,
        error: `Error occured in getting fee options service. Error: ${JSON.stringify(error)}`,
      };
    }
  }
}
