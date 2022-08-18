import { logger } from '../../../common/log-config';
import { getGasUsedInSimulationKey } from '../utils/cache-utils';
import { cache } from './caching';

const log = logger(module);

type FeeOptionServiceParams = {
  wallet: string,
  to: string,
  data: string,
  chainId: number
};

export const feeOptionsService = async (feeOptionServiceParams: FeeOptionServiceParams) => {
  try {
    const {
      wallet,
      to,
      data,
      chainId,
    } = feeOptionServiceParams;
    let feeOptionsData;
    // Cache check
    let gasUsedInSimulation = parseInt(
      await cache.get(getGasUsedInSimulationKey(wallet, to, data)),
      10,
    );
    // If not in cache then call simulation service
    if (!gasUsedInSimulation) {
      // Call simulate service
      gasUsedInSimulation = 500000;
    }
    // get gas price from network or cache for native asset
    // get gas price in erc 20 tokens from coin market cap and save that value in cache
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
