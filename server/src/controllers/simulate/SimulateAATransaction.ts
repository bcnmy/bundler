import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { aaSimulatonServiceMap, entryPointMap } from '../../../../common/service-manager';
import { parseError } from '../../../../common/utils';
import { STATUSES } from '../../middleware';

const log = logger(module);

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

    const aaSimulationResponse = await aaSimulatonServiceMap[chainId]
      .simulate({ userOp, entryPointContract, chainId });

    log.info(`AA simulation response: ${JSON.stringify(aaSimulationResponse)}`);

    if (!aaSimulationResponse.isSimulationSuccessful) {
      const { message } = aaSimulationResponse;
      return {
        code: STATUSES.BAD_REQUEST,
        message,
      };
    }
    req.body.params[4] = aaSimulationResponse.data.gasLimitFromSimulation;
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
