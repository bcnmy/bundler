// if checkLimits.areLimitsConsumed === false
// Push the data to queue to further check on maxUsage and currentUsage in transactionhandler
// if checkLimits.areLimitsConsumed === true

import { STATUSES } from '../../middleware';
import { LimitType, CheckLimitsMatchParamsTransactionAggregateType } from '../../dao-utils/interface/dao-utils';
import { config } from '../../../config';
import {
  CheckLimitsResponseType, ErrorType, GetLimitsUsageResponseType, LimitsConsumptionDataType,
} from './interface/native-api';
import type { NativeAPI } from '.';

import { logger } from '../../../log-config';
import { stringify } from '../../utils/util';

const log = logger(module);

// Request is sent back from meta entry point because of limits consumption
export async function checkLimits(
  this: NativeAPI,
  dappId: string,
  dappLimit: LimitType,
  userLimit: LimitType,
  apiLimit: LimitType,
  dappLimitStatus: number,
  userLimitStatus: number,
  apiLimitStatus: number,
  networkId: string,
  signerAddress: string,
  apiId: string,
): Promise<CheckLimitsResponseType | ErrorType> {
  let dappLimitMaxUsage;
  let userLimitMaxUsage;
  let apiLimitMaxUsage;
  let dappLimitCurrentUsage;
  let userLimitCurrentUsage;
  let apiLimitCurrentUsage;

  log.info(`Limit data for dappId: ${dappId}, signerAddress: ${signerAddress}, apiId: ${apiId}`);
  log.info(`dappLimit for dappId: ${dappId} is ${stringify(dappLimit)}`);
  log.info(`userLimit for dappId: ${dappId} is ${stringify(userLimit)}`);
  log.info(`apiLimit for dappId: ${dappId} is ${stringify(apiLimit)}`);
  log.info(`dappLimitStatus for dappId: ${dappId} is ${dappLimitStatus}`);
  log.info(`userLimitStatus for dappId: ${dappId} is ${userLimitStatus}`);
  log.info(`apiLimitStatus for dappId: ${dappId} is ${apiLimitStatus}`);

  if (dappLimitStatus) {
    const {
      areLimitsConsumed,
      maxUsage, currentUsage,
    } = await this.getLimitsUsage(
      dappLimit,
      [{ dappId }],
      dappId,
      networkId,
    );
    log.info(`dappLimitStatus response ${stringify(areLimitsConsumed)}`);
    if (areLimitsConsumed) {
      return {
        error: 'Dapp Limits consumed',
        code: STATUSES.BAD_REQUEST,
      };
    }
    dappLimitMaxUsage = maxUsage;
    dappLimitCurrentUsage = currentUsage;
  }

  if (userLimitStatus) {
    const {
      areLimitsConsumed,
      maxUsage, currentUsage,
    } = await this.getLimitsUsage(
      userLimit,
      [{ dappId }, { signerAddress }],
      dappId,
      networkId,
    );
    log.info(`userLimitStatus response ${stringify(areLimitsConsumed)}`);

    if (areLimitsConsumed) {
      return {
        error: 'User Limits consumed',
        code: STATUSES.BAD_REQUEST,
      };
    }
    userLimitMaxUsage = maxUsage;
    userLimitCurrentUsage = currentUsage;
  }

  if (apiLimitStatus) {
    const {
      areLimitsConsumed,
      maxUsage, currentUsage,
    } = await this.getLimitsUsage(apiLimit, [{ apiId }], dappId, networkId);
    log.info(`apiLimitStatus response ${stringify(areLimitsConsumed)}`);
    if (areLimitsConsumed) {
      return {
        error: 'Api Limits consumed',
        code: STATUSES.BAD_REQUEST,
      };
    }
    apiLimitMaxUsage = maxUsage;
    apiLimitCurrentUsage = currentUsage;
  }
  return {
    areLimitsConsumed: false,
    maxUsage: {
      dappLimit: dappLimitMaxUsage || 0,
      userLimit: userLimitMaxUsage || 0,
      apiLimit: apiLimitMaxUsage || 0,
    },
    currentUsage: {
      dappLimit: dappLimitCurrentUsage || 0,
      userLimit: userLimitCurrentUsage || 0,
      apiLimit: apiLimitCurrentUsage || 0,
    },
  };
}

export async function getLimitsUsage(
  this: NativeAPI,
  limit: LimitType,
  matchType: Array<CheckLimitsMatchParamsTransactionAggregateType>,
  dappId: string,
  networkId: string,
): Promise<GetLimitsUsageResponseType> {
  const limtsConsumptionData: LimitsConsumptionDataType = {
    areLimitsConsumed: false,
  };

  let { limitStartTime } = limit;
  const { limitDurationInMs } = limit;

  const date = new Date();
  const currentTime = date.getTime();

  // If limit duration needs to be reset
  if (limitStartTime + limitDurationInMs < currentTime) {
    log.info(`Reseting Dapp limit start time.
            Current Time: ${currentTime} LimitStartTime: ${limitStartTime} LimitDurationInMs ${limitDurationInMs}`);
    limitStartTime += limitDurationInMs;
    log.info(`New dapp limit start time is ${limitStartTime}`);
    await this.daoUtils.updateDappLimitStartTime(dappId, limitStartTime);
  }

  const startTime = limitStartTime;
  const endTime = limitStartTime + limitDurationInMs;
  const limitType = limit.type;
  log.info(`Checking for limit type ${limitType}`);
  log.info(`Matching for data ${stringify(matchType)}`);
  log.info(`Checking data between ${startTime} and ${endTime} on networkId ${networkId}`);
  switch (limitType) {
    case 0: {
      // Limit is based on Gas Usage
      const totalTransactionFee = await this.daoUtils.getTransactionFeeForCheckLimitsAggregate(
        matchType,
        startTime,
        endTime,
        parseInt(networkId, 10),
      );

      if (totalTransactionFee) {
        let totalTransactionFeeInStandardUnit;
        if (totalTransactionFee.length > 0) {
          const gasUsageResult = totalTransactionFee[0];
          // For ethereum current value is in wei
          const totalTransactionFeeInBaseUnit = gasUsageResult.totalTransactionFee;
          // For ethereum convert this into ether
          const decimal = config.decimal[networkId];
          totalTransactionFeeInStandardUnit = totalTransactionFeeInBaseUnit * 10 ** (-decimal);
        } else {
          totalTransactionFeeInStandardUnit = 0;
        }
        log.info(`Total Transaction Fee is ${totalTransactionFeeInStandardUnit} ${config.currency[networkId]}`);
        // Now check if limit exceeded current usage or not

        if (limit?.value <= totalTransactionFeeInStandardUnit) {
          limtsConsumptionData.areLimitsConsumed = true;
          limtsConsumptionData.maxUsage = limit.value;
          limtsConsumptionData.currentUsage = totalTransactionFeeInStandardUnit;
        } else {
          limtsConsumptionData.areLimitsConsumed = false;
          limtsConsumptionData.maxUsage = limit.value;
          limtsConsumptionData.currentUsage = totalTransactionFeeInStandardUnit;
        }
      }
      break;
    }
    case 1: {
      // Limit is based on number of transactions
      const totalTransactionCount = await this.daoUtils
        .getTransactionCountForCheckLimitsAggregate(
          matchType,
          startTime,
          endTime,
          parseInt(networkId, 10),
        );

      if (totalTransactionCount && totalTransactionCount.length > 0) {
        const { transactionCount } = totalTransactionCount[0];
        log.info(`Total Transaction count is ${transactionCount}`);
        if (limit?.value <= transactionCount) {
          limtsConsumptionData.areLimitsConsumed = true;
        }
      }

      break;
    }
    default:
      log.info(`Dapp Limit Type ${limitType} is not handled for dappId ${dappId}`);
  }

  return limtsConsumptionData;
}
