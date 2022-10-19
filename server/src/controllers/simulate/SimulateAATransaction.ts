import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { aaSimulatonServiceMap, entryPointMap } from '../../../../common/service-manager';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateAATransaction = async (req: Request, res: Response) => {
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
        code: 400,
        msgFromSimulation: 'Entry point not found in relayer node',
      };
    }

    const aaSimulationResponse = await aaSimulatonServiceMap[chainId]
      .simulate({ userOp, entryPointContract, chainId });

    if (!aaSimulationResponse.isSimulationSuccessful) {
      const { msgFromSimulation } = aaSimulationResponse;
      return {
        code: 400,
        msgFromSimulation,
      };
    }
    req.body.params[3] = aaSimulationResponse.gasLimitFromSimulation;
    return {
      code: 200,
      msgFromSimulation: 'AA transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in simulateAATransaction ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
