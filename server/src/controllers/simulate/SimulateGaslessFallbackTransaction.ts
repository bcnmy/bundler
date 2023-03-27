import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { gaslessFallbackSimulationServiceMap } from '../../../../common/service-manager';
import { STATUSES } from '../../middleware';

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
      const { message } = gaslessFallbackSimulationResponse;
      return {
        code: STATUSES.BAD_REQUEST,
        message,
      };
    }
    const { gasLimitFromSimulation } = gaslessFallbackSimulationResponse.data;
    req.body.params[1] = gasLimitFromSimulation;
    log.info(`gasLimitFromSimulation: ${gasLimitFromSimulation} or gasless fallback: ${to} on chainId: ${chainId}`);
    log.info(`Transaction successfully simulated for gasless fallback: ${to} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'Transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in Gasless Fallback transaction simulation ${error}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in Gasless Fallback transaction simulation ${JSON.stringify(error)}`,
    };
  }
};
