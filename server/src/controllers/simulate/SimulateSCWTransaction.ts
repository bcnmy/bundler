import { Request, Response } from 'express';
import { logger } from '../../../../common/log-config';
import { scwSimulationServiceMap } from '../../../../common/service-manager';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const simulateSCWTransaction = async (req: Request, res: Response) => {
  try {
    const {
      to, data, chainId, refundInfo,
    } = req.body.params[0];

    const scwSimulationResponse = await scwSimulationServiceMap[chainId].simulate({
      to,
      data,
      chainId,
      refundInfo,
    });

    if (!scwSimulationResponse.isSimulationSuccessful) {
      const { msgFromSimulation } = scwSimulationResponse;
      return {
        code: 400,
        msgFromSimulation,
      };
    }
    const { gasLimitFromSimulation } = scwSimulationResponse;
    req.body.params[1] = gasLimitFromSimulation;
    log.info(`Transaction successfully simulated for SCW: ${to} on chainId: ${chainId}`);
  } catch (error) {
    log.error(`Error in SCW simulation ${error}`);
    return res.status(500).json({
      error,
    });
  }
};
