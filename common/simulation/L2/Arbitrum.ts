/* eslint-disable import/no-import-module-exports */
import { ethers } from 'ethers';
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory';
import {
  NODE_INTERFACE_ADDRESS,
} from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { UserOperationType } from '../../types';
import { abi } from '../../../config/static-config.json';
import { config } from '../../../config';
import { logger } from '../../logger';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const calcArbitrumPreVerificationGas = async (
  entryPointAddress: string,
  userOp: UserOperationType,
  chainId: number,
): Promise<number> => {
  const simulateValidationCallData = new ethers.utils.Interface(
    abi.entryPointAbi,
  ).encodeFunctionData('handleOps', [[userOp], userOp.sender]);

  const providerUrl = JSON.parse(process.env.PROVIDER_URLS as string)[chainId]
  || config.chains.provider[chainId];

  const baseL2Provider = ethers.providers.getDefaultProvider(
    providerUrl,
  );
  const nodeInterface = NodeInterface__factory.connect(
    NODE_INTERFACE_ADDRESS,
    baseL2Provider,
  );
    // And the estimations from NodeInterface.GasEstimateComponents()
  const gasEstimateComponents = await nodeInterface.callStatic.gasEstimateL1Component(
    entryPointAddress,
    false,
    simulateValidationCallData,
  );
  log.info('Gas estimate components', gasEstimateComponents.gasEstimateForL1.toNumber());
  return gasEstimateComponents.gasEstimateForL1.toNumber();
};
