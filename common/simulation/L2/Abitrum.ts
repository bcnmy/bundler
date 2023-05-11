import { ethers, utils } from 'ethers';
import { ArbGasInfo__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ArbGasInfo__factory';
import { NodeInterface__factory } from '@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory';
import {
  ARB_GAS_INFO,
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
): Promise<number> => {
  try {
    log.info('Calculating gas price for user operation', userOp);
    const simulateValidationCallData = new ethers.utils.Interface(
      abi.entryPointAbi,
    ).encodeFunctionData('simulateValidation', [entryPointAddress, userOp]);

    const baseL2Provider = ethers.providers.getDefaultProvider(
      config.chains.provider[421613],
    );
    // Instantiation of the ArbGasInfo and NodeInterface objects
    const arbGasInfo = ArbGasInfo__factory.connect(
      ARB_GAS_INFO,
      baseL2Provider,
    );
    const nodeInterface = NodeInterface__factory.connect(
      NODE_INTERFACE_ADDRESS,
      baseL2Provider,
    );

    log.info('arbGasInfo', arbGasInfo);
    log.info('nodeInterface', nodeInterface);
    // Getting the gas prices from ArbGasInfo.getPricesInWei()
    const gasComponents = await arbGasInfo.callStatic.getPricesInWei();

    // And the estimations from NodeInterface.GasEstimateComponents()
    const gasEstimateComponents = await nodeInterface.callStatic.gasEstimateComponents(
      entryPointAddress,
      false,
      simulateValidationCallData,
    );
    const l2GasUsed = gasEstimateComponents.gasEstimate.sub(
      gasEstimateComponents.gasEstimateForL1,
    );

    // Setting the variables of the formula
    const P = gasComponents[5];
    const L2G = l2GasUsed;
    const L1P = gasComponents[1];
    const L1S = 140 + utils.hexDataLength(simulateValidationCallData);

    // Getting the result of the formula
    // ---------------------------------

    // L1C (L1 Cost) = L1P * L1S
    const L1C = L1P.mul(L1S);

    // B (Extra Buffer) = L1C / P
    const B = L1C.div(P);

    // G (Gas Limit) = L2G + B
    const G = L2G.add(B);

    // TXFEES (Transaction fees) = P * G
    const TXFEES = P.mul(G);

    log.info('Transaction summary');
    log.info('-------------------');
    log.info(`P (L2 Gas Price) = ${utils.formatUnits(P, 'gwei')} gwei`);
    log.info(`L2G (L2 Gas used) = ${L2G.toNumber()} units`);
    log.info(
      `L1P (L1 estimated calldata price per byte) = ${utils.formatUnits(
        L1P,
        'gwei',
      )} gwei`,
    );
    log.info(`L1S (L1 Calldata size in bytes) = ${L1S} bytes`);
    log.info('-------------------');
    log.info(
      `Transaction estimated fees to pay = ${utils.formatEther(TXFEES)} ETH`,
    );
    return L1C.toNumber();
  } catch (e: any) {
    log.error('Error', e.message);
    return 0;
  }
};
