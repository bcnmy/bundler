import { logger } from '../../../common/log-config';

const log = logger(module);

type FeeOptionServiceParams = {
  chainId: number
};

export const feeOptionsService = async (feeOptionServiceParams: FeeOptionServiceParams) => {
  try {
    const {
      chainId,
    } = feeOptionServiceParams;
    let feeOptionsData;

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
