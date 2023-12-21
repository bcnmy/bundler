/* eslint-disable import/no-import-module-exports */
import { Request } from 'express';
import { logger } from '../../../../common/logger';
import { scwSimulationServiceMap } from '../../../../common/service-manager';
import { STATUSES } from '../../middleware';
import { customJSONStringify } from '../../../../common/utils';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const simulateSCWTransaction = async (req: Request) => {
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
      const { message } = scwSimulationResponse;
      return {
        code: STATUSES.BAD_REQUEST,
        message,
      };
    }
    const simulationData = scwSimulationResponse.data;
    req.body.params[1] = simulationData.gasLimitFromSimulation;
    req.body.params[2] = {
      refundAmount: simulationData.refundAmount,
      refundAmountInUSD: simulationData.refundAmountInUSD,
    };
    log.info(`Transaction successfully simulated for SCW: ${to} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'Transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in SCW transaction simulation ${customJSONStringify(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in SCW transaction simulation ${customJSONStringify(error)}`,
    };
  }
};
