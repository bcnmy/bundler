import { logger } from '../../../common/log-config';
import { getGasUsedInSimulationKey } from '../utils/cache-utils';
import { cache } from './caching';

const log = logger(module);

export const feeOptionsService = async (wallet: string, to: string, data: string) => {
  try {
    let feeOptionsData;
    // Cache check
    const gasUsedInSimulation = cache.get(getGasUsedInSimulationKey(wallet, to, data));
    // If not in cache then call simulation service
    if (!gasUsedInSimulation) {

    }
    return {
      code: 200,
      msg: 'Fee options fetched successfully',
      data: feeOptionsData,
    };
  } catch (error) {
    log.info(error);
    return {
      code: 500,
      error: `Error occured in getting fee options service. Error: ${JSON.stringify(error)}`,
    };
  }
};
