import { ethers } from 'ethers';
import { STATUSES } from '../../middleware';
import { getGasPriceKey } from '../../utils/cache-utils';
import { config } from '../../../config';
import { getNetwork } from '../blockchain/network-manager';
import { cache } from '../caching';
import { PreFlightCheckResponseType, ErrorType } from './interface/native-api';
import { logger } from '../../../log-config';
import type { NativeAPI } from '.';

const log = logger(module);

export async function forwardPreFlightCheck(
  this: NativeAPI,
  networkId:number,
  forwardRequest:any,
): Promise<PreFlightCheckResponseType | ErrorType> {
  const result = { readyToPay: false, errorMessage: '' };

  const { TOKEN_GAS_PRICE_THRESHOLD_PERCENTAGE } = config;

  result.readyToPay = false;
  const network = getNetwork(networkId);
  if (!network) {
    return {
      error: `Network with id ${networkId} is undefined`,
      code: STATUSES.BAD_REQUEST,
    };
  }
  const tokenAddress = forwardRequest.token;
  const tokenGasPriceFromRequest = forwardRequest.tokenGasPrice;

  // Network calls
  const oracleAggregatorAddress = config.oracleAggregatorAddressMap[networkId];
  const oracleAggregatorAbi = config.oracleAggregatorAbiMap[networkId];
  const oracleAggregatorContract = network.getContract(
    oracleAggregatorAddress,
    oracleAggregatorAbi,
  );
  const tokenPriceCurrent = await oracleAggregatorContract.getTokenPrice(
    tokenAddress,
  );
  const tokenOracleDecimals = await oracleAggregatorContract.getTokenOracleDecimals(
    tokenAddress,
  );

  const gasPriceFromCache = await cache.get(
    getGasPriceKey(networkId.toString(), config.networksGasPriceType[networkId]),
  );

  const gasPrice = ethers.BigNumber.from(
    ethers.utils.parseUnits(gasPriceFromCache.toString(), 'wei').toString(),
  );
  const tokenGasPriceCurrent = ethers.BigNumber.from(gasPrice)
    .mul(ethers.BigNumber.from(10).pow(tokenOracleDecimals))
    .div(tokenPriceCurrent);

  if (tokenGasPriceCurrent && tokenPriceCurrent && tokenOracleDecimals) {
    log.info(`token price ${tokenPriceCurrent.toString()}`);
    log.info(`token oracle decimals ${tokenOracleDecimals.toString()}`);
    log.info(`token gas price ${tokenGasPriceCurrent.toString()}`);

    const minimumTokenGasPriceAccepted = ethers.BigNumber.from(
      TOKEN_GAS_PRICE_THRESHOLD_PERCENTAGE,
    )
      .mul(ethers.BigNumber.from(tokenGasPriceCurrent))
      .div(ethers.BigNumber.from(100));

    if (tokenGasPriceFromRequest.lte(minimumTokenGasPriceAccepted)) {
      log.info('Not favorable to process this transaction');
      result.errorMessage = '$token/ETH pair price has dropped beyond threshold';
    } else {
      result.readyToPay = true;
    }
  }
  return result;
}
