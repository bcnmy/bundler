/* eslint-disable no-await-in-loop */
import Big from 'big.js';
import { ethers } from 'ethers';
import { redisClient } from '../../../common/db';
import { logger } from '../../../common/log-config';
import { config } from '../../config';
import { gasPriceMap } from '../service-manager';

const log = logger(module);

type FeeOptionServiceParams = {
  chainId: number
};

type FeeOptionResponseParams = {
  tokenGasPrice: number;
  symbol: string;
  address: string;
  decimal: number;
  logoUrl: string;
  offset: number;
  feeTokenTransferGas: number;
  refundReceiver?: string;
};

const convertGasPriceToUSD = async (
  nativeChainId: number,
  gasPrice: string,
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

export const feeOptionsService = async (feeOptionServiceParams: FeeOptionServiceParams) => {
  const response: Array<FeeOptionResponseParams> = [];

  try {
    const {
      chainId,
    } = feeOptionServiceParams;

    const feeTokens = config.supportedFeeTokens[chainId];
    console.log(gasPriceMap[chainId]);
    const gasPrice: string = await gasPriceMap[chainId].getGasPrice();

    let networkPriceDataInString = await redisClient.get('NETWORK_PRICE_DATA') || '';
    if (!networkPriceDataInString) {
      networkPriceDataInString = '{"1":1652.34,"4":1652.34,"5":1652.34,"137":0.80,"80001":0.80}';
      await redisClient.set('NETWORK_PRICE_DATA', networkPriceDataInString);
    }
    const networkPriceData = JSON.parse(networkPriceDataInString);
    const chainPriceDataInUSD = networkPriceData[chainId];

    for (const token of feeTokens) {
      let tokenGasPrice;
      let decimal;
      if (config.similarTokens[chainId].includes(token)) { // check if same token
        tokenGasPrice = gasPrice;
        decimal = config.decimal[chainId];
      } else if (token === 'USDC' || token === 'USDT') {
        const abi = [
          'function balanceOf(walletAddress) view returns (uint256)',
          'function decimals() view returns (uint256)',
        ];
        const tokenContract = new ethers.Contract(config.tokenContractAddress[chainId][token], abi);
        decimal = tokenContract.decimals(); // fetch it from contract
        tokenGasPrice = await convertGasPriceToUSD(chainId, gasPrice, chainPriceDataInUSD, token);
        tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
      } else if (token === 'DAI') {
        decimal = 18; // fetch it from contract
        tokenGasPrice = await convertGasPriceToUSD(chainId, gasPrice, chainPriceDataInUSD, token);
        tokenGasPrice = new Big(tokenGasPrice).mul(10 ** decimal).toFixed(0).toString();
      } else {
        // calculate for cross chain
        const crossChainId = config.wrappedTokens[token];
        if (crossChainId) {
          const gasPriceInUSD = await convertGasPriceToUSD(
            chainId,
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
        address: config.tokenContractAddress[chainId][token],
        decimal,
        logoUrl: config.logoUrl[token],
        offset: config.offset[token],
        feeTokenTransferGas: config.feeTokenTransferGas[chainId][token],
        refundReceiver: config.refundReceiver[chainId][token],
      });
    }
    return {
      response,
    };
  } catch (error) {
    log.info(error);
    console.log(error);
    return {
      code: 500,
      error: `Error occured in getting fee options service. Error: ${JSON.stringify(error)}`,
    };
  }
};
