/* eslint-disable import/no-import-module-exports */
import { Request } from 'express';
import { logger } from '../../../../common/logger';
import { bundlerSimulatonServiceMap, entryPointMap } from '../../../../common/service-manager';
import { parseError } from '../../../../common/utils';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../middleware';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

// eslint-disable-next-line consistent-return
export const simulateAATransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];

    const entryPointContracts = entryPointMap[chainId];

    let entryPointContract;
    for (let entryPointContractIndex = 0;
      entryPointContractIndex < entryPointContracts.length;
      entryPointContractIndex += 1) {
      if (entryPointContracts[entryPointContractIndex].address.toLowerCase()
       === entryPointAddress.toLowerCase()) {
        entryPointContract = entryPointContracts[entryPointContractIndex].entryPointContract;
        break;
      }
    }
    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: 'Entry point not found in relayer node',
      };
    }

    const aaSimulationResponse = await bundlerSimulatonServiceMap[chainId]
      .simulateValidation({ userOp, entryPointContract, chainId });

    log.info(`AA simulation response: ${JSON.stringify(aaSimulationResponse)}`);

    const {
      code,
      message,
    } = aaSimulationResponse;

    if (code !== STATUSES.SUCCESS) {
      if (code === BUNDLER_VALIDATION_STATUSES.WALLET_TRANSACTION_REVERTED) {
        return {
          code,
          message,
        };
      }
      return {
        code,
        message,
      };
    }
    req.body.params[4] = aaSimulationResponse.data.totalGas;
    req.body.params[5] = aaSimulationResponse.data.userOpHash;

    log.info(`Transaction successfully simulated for userOp: ${JSON.stringify(userOp)} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'AA transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in AA transaction simulation ${parseError(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in AA transaction simulation ${parseError(error)}`,
    };
  }
};
