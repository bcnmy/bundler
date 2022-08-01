import { Types } from 'mongoose';
import { IDaoUtils } from '../../dao-utils/interface/dao-utils';
import { STATUSES } from '../../middleware';
import { parseError } from '../../utils/util';

import { logger } from '../../../log-config';

const log = logger(module);

export const gnosisWhitelistTargetContracts = async (
  dappId: Types.ObjectId,
  contractAddresses: Array<string>,
  daoUtilsInstance: IDaoUtils,
) => {
  try {
    const whitelistingTargetContractsResult = await daoUtilsInstance
      .saveWhitelistTargetContractsResult(
        dappId,
        contractAddresses,
      );

    if (whitelistingTargetContractsResult) {
      return {
        code: STATUSES.SUCCESS,
        log: 'Gnosis target contracts are whitelisted',
      };
    }
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: 'Error in saving gnosis target contracts are whitelisted',
    };
  } catch (error) {
    log.error(parseError(error));
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: parseError(error),
    };
  }
};
