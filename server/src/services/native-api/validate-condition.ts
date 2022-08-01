import { IDaoUtils } from '../../dao-utils/interface/dao-utils';
import { STATUSES } from '../../middleware';
import { ConditionCheck } from '../conditional';

export const validateConditionalLimit = async (
  daoUtils: IDaoUtils,
  from: string,
  apiId: string,
) => {
  try {
    const result = { conditionPassed: false, errorMessage: '' };
    const conditionCheck = new ConditionCheck(daoUtils, from);
    const conditionExists = await conditionCheck.exists(apiId);

    if (conditionExists) {
      const conditionValid = await conditionCheck.isValid();
      if (conditionValid.status) {
        result.conditionPassed = true;
        return result;
      }
      result.errorMessage = conditionValid.result;
      return result;
    }
    result.conditionPassed = true;
    return result;
  } catch (e: any) {
    return {
      error: JSON.stringify(e),
      code: STATUSES.INTERNAL_SERVER_ERROR,
    };
  }
};
