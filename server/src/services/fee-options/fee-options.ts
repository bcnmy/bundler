/* eslint-disable no-await-in-loop */
import Big from 'big.js';
import { logger } from '../../../../common/log-config';
FeeOptionResponse
const log = logger(module);

const convertGasPriceToUSD = async (
  nativeChainId: number,
  gasPrice: number,
  chainPriceDataInUSD: number,
  token: string,
) => {
  const decimal = config.decimal[nativeChainId];
  const usdc = new Big(gasPrice)
    .mul(new Big(chainPriceDataInUSD))
    .div(new Big(10 ** decimal))
    .mul(new Big(config.offset[token]))
    .toString();
  return usdc;
};

export class FeeOption {
  chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  async get() {
    const response: Array<FeeOptionResponseParams> = [];

    try {
      const feeTokens = config.supportedFeeTokens[this.chainId];
      const gasPrice = await gasPriceMap[this.chainId].getGasPrice();

      const networkPriceDataInString = await redisClient.get('NETWORK_PRICE_DATA');
      const networkPriceData = JSON.parse(networkPriceDataInString);
      const chainPriceDataInUSD = networkPriceData[this.chainId];

      for (const token of feeTokens) {
        let tokenGasPrice;
        let decimal;
        if (config.similarTokens[this.chainId].includes(token)) { // check if same token
          tokenGasPrice = gasPrice;
          decimal = config.decimal[this.chainId];
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
          const crossChainId = config.wrappedTokens[token];
          if (crossChainId) {
            const gasPriceInUSD = await convertGasPriceToUSD(
              this.chainId,
              gasPrice,
              chainPriceDataInUSD,
              token,
            );
            const crossChainPrice = networkPriceData[crossChainId];
            tokenGasPrice = new Big(gasPriceInUSD).div(new Big(crossChainPrice));
            decimal = config.decimal[crossChainId];
            tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
          }
        }
        response.push({
          tokenGasPrice: Number(tokenGasPrice),
          symbol: token,
          address: config.tokenContractAddress[this.chainId][token],
          decimal,
          logoUrl: config.logoUrl[token],
          offset: config.offset[token],
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
