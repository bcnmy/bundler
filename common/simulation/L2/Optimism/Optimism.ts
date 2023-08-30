/* eslint-disable no-param-reassign */
import { ethers } from 'ethers';
import { OptimisticL1GasPriceOracle } from './optimisticL1GasPriceOracle';
import { UserOperationType } from '../../../types';
import { abi } from '../../../../config/static-config.json';
import { config } from '../../../../config';
import { logger } from '../../../log-config';
import RpcError from '../../../utils/rpc-error';
import { BUNDLER_VALIDATION_STATUSES } from '../../../../server/src/middleware';

const log = logger(module);

export const calcOptimismPreVerificationGas = async (
  userOp: UserOperationType,
  chainId: number,
  baseFeePerGas?: number,
): Promise<number> => {
  log.info(`Calculating pvg for userOp: ${JSON.stringify(userOp)}`);

  if (!baseFeePerGas) {
    throw new RpcError(
      `baseFeePerGas not available for chainId: ${chainId}`,
      BUNDLER_VALIDATION_STATUSES.SIMULATE_PAYMASTER_VALIDATION_FAILED,
    );
  }
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
  const l2MaxFee = userOp.maxFeePerGas;
  const l2PriorityFee = baseFeePerGas + Number(userOp.maxPriorityFeePerGas);

  const l2Price = l2MaxFee < l2PriorityFee ? l2MaxFee : l2PriorityFee;

  const l2PriceBigNumber = ethers.BigNumber.from(l2Price).mul('1000000000');
  const extraPvg = l1Fee.div(l2PriceBigNumber);

  return extraPvg.toNumber();
};
