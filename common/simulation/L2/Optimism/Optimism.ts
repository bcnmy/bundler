/* eslint-disable no-param-reassign */
import { BigNumber, ethers } from 'ethers';
import { OptimisticL1GasPriceOracle } from './optimisticL1GasPriceOracle';
import { UserOperationType } from '../../../types';
import { abi } from '../../../../config/static-config.json';
import { config } from '../../../../config';
import { logger } from '../../../log-config';

const log = logger(module);

export const calcGasPrice = async (
  entryPointAddress: string,
  userOp: UserOperationType,
  chainId: number,
): Promise<number> => {
  try {
    log.info(`Calculating pvg for userOp: ${JSON.stringify(userOp)}`);
    // Encode function data for GetL1Fee
    const handleOpsData = new ethers.utils.Interface(
      abi.entryPointAbi,
    ).encodeFunctionData('handleOps', [[userOp], userOp.sender]);

    const baseL2Provider = ethers.providers.getDefaultProvider(
      config.chains.provider[chainId],
    );
    const gasPriceOracleInterface = new OptimisticL1GasPriceOracle(
      baseL2Provider,
    );
    const l1Fee = await gasPriceOracleInterface.getL1Fee(handleOpsData);

    // extraPvg = l1Cost / l2Price
    const l2Price = BigNumber.from('150000000');
    const extraPvg = l1Fee.div(l2Price);

    return extraPvg.toNumber();
  } catch (e: any) {
    log.error('Error', e.message);
    return 0;
  }
};
