import { STATUSES } from '../../middleware';

import { logger } from '../../../log-config';
import { IDaoUtils } from '../../dao-utils/interface/dao-utils';
import { parseError } from '../../utils/util';

const log = logger(module);

export const getTransactionStatusById = async (
  networkId: number,
  transactionId: string,
  daoUtilsInstance: IDaoUtils,
) => {
  try {
    const data = await daoUtilsInstance.findTransactionStatusByTransactionId(
      networkId,
      transactionId,
    );
    return {
      log: 'Transaction data fetched successfully',
      code: STATUSES.SUCCESS,
      data,
    };
  } catch (error) {
    log.error(parseError(error));
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Transaction data could not be fetched with error: ${parseError(error)}`,
    };
  }
};
