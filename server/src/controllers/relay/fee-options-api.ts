/* eslint-disable no-await-in-loop */
import axios from 'axios';
import { ethers } from 'ethers';
import { Request, Response } from 'express';
import { redisClient } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { config } from '../../../config';
import { gasPriceMap } from '../../service-manager';

const log = logger(module);

const convertGasPriceFrom = async (amount: string, symbol: string, token: string) => {
  const data = await axios.get(`https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=${amount}&symbol=${symbol}&convert=${token}`, {
    headers: {
      'X-CMC_PRO_API_KEY': config.coinMarketCapApiKey,
    },
  });
  console.log(JSON.stringify(data.data.data[0].quote), amount, symbol, token);
  return data.data.data[0].quote;
};

export const feeOptionsApi = async (req: Request, res: Response) => {
  const chainIdInString = req.query.chainId as string;
  const chainId = Number(chainIdInString);
  const response = [];
  // const networkPriceDataInString = await redisClient.get('NETWORK_PRICE_DATA');
  // const networkPriceData = JSON.parse(networkPriceDataInString);
  // const chainPriceDataInUSD = networkPriceData[chainId];
  const gasPrice = await gasPriceMap[chainId].getGasPrice();
  const decimal = config.decimal[chainId];
  const usdc = ethers.BigNumber.from(gasPrice)
    .div(ethers.BigNumber.from(10).pow(decimal))
    .mul(ethers.BigNumber.from(1861)).toString();
  console.log(usdc, 'in usdc');

  if (!gasPrice) {
    return res.json({
      error: `gas price not available for networkId ${chainId}`,
    }).status(400);
  }

  // 5, 80001

  // tokenGasPrice
  // symbol
  // address
  // decimals`
  // 30 * 10 ^-9 * coinmarketprice(matic) => 5 gas price in usd
  // weth => 30 * 10 ^-9 * coinmarketprice(eth)
  // matic 30 gwei
  // usdc, usdt, and weth ?
  const feeTokens = config.supportedFeeTokens[chainId];

  for (const token of feeTokens) {
    const symbol = config.currency[chainId];
    // const tokenGasPrice = await convertGasPriceFrom(amt, symbol, token);
    response.push({
      tokenGasPrice: '',
      symbol: token,
      address: config.tokenContractAddress[chainId][token],
      value: gasPrice,
      decimal,
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
