/* eslint-disable no-await-in-loop */
import Big from 'big.js';
import { Request, Response } from 'express';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { gasPriceMap } from '../../service-manager';

const log = logger(module);

const convertGasPriceToUSD = async (
  nativeChainId: number,
  gasPrice: number,
  chainPriceDataInUSD: number,
) => {
  const decimal = config.decimal[nativeChainId];
  const usdc = new Big(gasPrice)
    .div(new Big(10 ** decimal))
    .mul(new Big(chainPriceDataInUSD))
    .toString();
  return usdc;
};

export const feeOptionsApi = async (req: Request, res: Response) => {
  const chainIdInString = req.query.chainId as string;
  const chainId = Number(chainIdInString);
  const response = [];

  const feeTokens = config.supportedFeeTokens[chainId];
  const gasPrice = await gasPriceMap[chainId].getGasPrice();

  const networkPriceDataInString = await redisClient.get('NETWORK_PRICE_DATA');
  const networkPriceData = JSON.parse(networkPriceDataInString);
  const chainPriceDataInUSD = networkPriceData[chainId];

  for (const token of feeTokens) {
    let tokenGasPrice;
    let decimal;
    if (config.similarTokens[chainId].includes(token)) {
      tokenGasPrice = gasPrice;
      decimal = config.decimal[chainId];
    } else if (token === 'USDC' || token === 'USDT') {
      tokenGasPrice = await convertGasPriceToUSD(chainId, gasPrice, chainPriceDataInUSD);
      decimal = 6;
    } else {
      // calculate for cross chain
      const crossChainId = config.wrappedTokens[token];
      if (crossChainId) {
        const gasPriceInUSD = await convertGasPriceToUSD(chainId, gasPrice, chainPriceDataInUSD);
        const crossChainPrice = networkPriceData[crossChainId];
        tokenGasPrice = new Big(gasPriceInUSD).div(new Big(crossChainPrice)).toString();
        decimal = config.decimal[crossChainId];
      }
    }
    response.push({
      tokenGasPrice,
      symbol: token,
      address: config.tokenContractAddress[chainId][token],
      decimal,
      logoUrl: config.logoUrl[token],
    });
  }
  try {
    return res.json({
      msg: 'all ok',
      data: {
        chainId,
        response,
      },
    });
  } catch (error) {
    log.error(`Error in relay ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
