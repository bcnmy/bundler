import { STATUSES } from '../../middleware';

import { getSmartContractListKey } from '../../utils/cache-utils';
import { cache } from '../caching';

import { logger } from '../../../log-config';
import { IDaoUtils, SmartContractType } from '../../dao-utils/interface/dao-utils';
import { parseError } from '../../utils/util';

const log = logger(module);

export const getSmartContracts = async (
  dappId: string,
  daoUtilsInstance: IDaoUtils,
  contractAddresses?: Array<string>,
) => {
  try {
    let smartContracts: Array<SmartContractType> = [];
    const smartContractListFromCache = await cache.get(
      getSmartContractListKey(dappId),
    );
    if (smartContractListFromCache && smartContractListFromCache === 'string' && JSON.parse(smartContractListFromCache).length) {
      log.info(`Smart Contracts found in cache for dappId : ${dappId}`);

      if (contractAddresses && contractAddresses.length > 0) {
        const allSmartContractsList: Array<SmartContractType> = JSON.parse(
          smartContractListFromCache,
        );
        contractAddresses.forEach((contractAddress: string) => {
          const contract = allSmartContractsList.find(
            (smartContract) => smartContract.address === contractAddress,
          );
          if (contract) {
            smartContracts.push(contract);
          }
        });
      } else {
        smartContracts = JSON.parse(smartContractListFromCache);
      }
    } else {
      const smartContractsList = await daoUtilsInstance.getSmartContractsByDappId(
        dappId,
      );

      const smartContractsCacheArray : Array<SmartContractType> = [];

      smartContractsList.forEach(async (smartContract: SmartContractType) => {
        const smartContractObj = {
          _id: smartContract._id,
          name: smartContract.name,
          dappId: smartContract.dappId,
          address: smartContract.address,
          abi: smartContract.abi,
          type: smartContract.type,
          metaTransactionType: smartContract.metaTransactionType,
          walletType: smartContract.walletType,
          createdBy: smartContract.createdBy,
          createdOn: smartContract.createdOn,
        };
        smartContractsCacheArray.push(smartContractObj);
      });

      await cache.set(getSmartContractListKey(
        dappId,
      ), JSON.stringify(smartContractsCacheArray));
      smartContracts = smartContractsList;
    }
    return {
      log: 'SmartContracts fetched successfully',
      code: STATUSES.SUCCESS,
      data: {
        total: smartContracts.length,
        smartContracts,
      },
    };
  } catch (error) {
    log.error(parseError(error));
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Smart contracts could not be listed with error: ${parseError(error)}`,
    };
  }
};
