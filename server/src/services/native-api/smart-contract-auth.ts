import { ISmartContract } from '@bcnmy/db-sdk/dist/schemas';
import mongoose from 'mongoose';
import type { NativeAPI } from '.';
import { logger } from '../../../log-config';
import { STATUSES } from '../../middleware';
import { getSmartContractKey } from '../../utils/cache-utils';
import { cache } from '../caching';
import { ErrorType } from './interface/native-api';

const log = logger(module);

export async function smartContractAuth(
  this: NativeAPI,
  contractId: mongoose.Types.ObjectId,
): Promise<ISmartContract | ErrorType> {
  const smartContractFromCache = await cache.get(getSmartContractKey(
    contractId.toString(),
  ));
  let smartContract;
  if (smartContractFromCache) {
    log.info(`Contract data found in cache with contractId ${contractId}`);
    smartContract = JSON.parse(smartContractFromCache);
  } else {
    log.info(
      `Contract data not found in cache with contractId ${contractId}, fetching Data from DB`,
    );
    smartContract = await this.daoUtils.findOneSmartContractByContractId(contractId);
    if (!smartContract) {
      return {
        error: 'No Smart Contract found for given api key in header',
        code: STATUSES.BAD_REQUEST,
      };
    }
    await cache.set(
      getSmartContractKey(contractId.toString()),
      JSON.stringify(smartContract),
    );
  }
  return smartContract;
}
