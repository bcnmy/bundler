import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { gaslessFallbackSimulationServiceMap } from '../../../../common/service-manager';

const log = logger(module);

export const simulateGaslessFallbackTransaction = async (req:Request) => {
  try {
    const {
      to,
      data,
      chainId,
    } = req.body.params[0];

    const gaslessFallbackSimulationResponse = await gaslessFallbackSimulationServiceMap[chainId]
      .simulate({
        to,
        data,
        chainId,
      });

    if (!gaslessFallbackSimulationResponse.isSimulationSuccessful) {
      const { msgFromSimulation } = gaslessFallbackSimulationResponse;
      return {
        code: 400,
        msgFromSimulation,
      };
    }
    const { gasLimitFromSimulation } = gaslessFallbackSimulationResponse;
    req.body.params[1] = gasLimitFromSimulation;
    log.info(`Transaction successfully simulated for gasless fallback: ${to} on chainId: ${chainId}`);
    return {
      code: 200,
      msgFromSimulation: 'Transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in Gasless Fallback transaction simulation ${JSON.stringify(error)}`);
    return {
      code: 500,
      error: `Error in Gasless Fallback transaction simulation ${JSON.stringify(error)}`,
    };
  }
};
