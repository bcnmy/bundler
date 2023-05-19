import { BigNumber, ethers } from 'ethers';
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory';
import {
  NODE_INTERFACE_ADDRESS,
} from '@arbitrum/sdk/dist/lib/dataEntities/constants';
import { UserOperationType } from '../../types';
import { abi } from '../../../config/static-config.json';
import { config } from '../../../config';
import { logger } from '../../log-config';

const log = logger(module);

export const calcGasPrice = async (
  entryPointAddress: string,
  userOp: UserOperationType,
  chainId: number,
): Promise<number> => {
  try {
    const simulateUserOp = {
      ...userOp,
      // default values for missing fields.
      signature:
        '0x73c3ac716c487ca34bb858247b5ccf1dc354fbaabdd089af3b2ac8e78ba85a4959a2d76250325bd67c11771c31fccda87c33ceec17cc0de912690521bb95ffcb1b', // a valid signature
      callGasLimit: BigNumber.from('0'),
      maxFeePerGas: BigNumber.from('0'),
      maxPriorityFeePerGas: BigNumber.from('0'),
      preVerificationGas: BigNumber.from('0'),
      verificationGasLimit: BigNumber.from('0'),
    };
    log.info('Calculating gas price for user operation', simulateUserOp);

    const simulateValidationCallData = new ethers.utils.Interface(
      abi.entryPointAbi,
    ).encodeFunctionData('handleOps', [[simulateUserOp], userOp.sender]);

    const baseL2Provider = ethers.providers.getDefaultProvider(
      config.chains.provider[chainId],
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
  } catch (e: any) {
    log.error('Error', e.message);
    return 0;
  }
};
