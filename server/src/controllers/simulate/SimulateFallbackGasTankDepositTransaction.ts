import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { fallbackGasTankDepositSimulationServiceMap } from '../../../../common/service-manager';
import { STATUSES } from '../../middleware';

const log = logger(module);

export const simulateFallbackGasTankDepositTransaction = async (req: Request) => {
  try {
    const {
      value,
      paymasterId,
      chainId,
    } = req.body.params[0];
    log.info(`value: ${value}`);
    log.info(`paymasterId: ${paymasterId}`);
    log.info(`chainId: ${chainId}`);

    const fallbackGasTankDepositSimilationResponse = await
    fallbackGasTankDepositSimulationServiceMap[chainId]
      .simulate({
        value,
        paymasterId,
        chainId,
      });

    if (!fallbackGasTankDepositSimilationResponse.isSimulationSuccessful) {
      const { message } = fallbackGasTankDepositSimilationResponse;
      return {
        code: STATUSES.BAD_REQUEST,
        message,
      };
    }
    const { gasLimitFromSimulation } = fallbackGasTankDepositSimilationResponse.data;
    req.body.params[1] = gasLimitFromSimulation;
    log.info(`gasLimitFromSimulation: ${gasLimitFromSimulation} for falback gas tank deposit on paymasterId: ${paymasterId} on chainId: ${chainId}`);
    log.info(`Transaction successfully simulated for falback gas tank depositon paymasterId: ${paymasterId} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'Transaction successfully simulated',
    };
  } catch (error) {
    log.error(`Error in Fallback Gas Tank Depsoit transaction simulation ${error}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in Gasless Fallback transaction simulation ${JSON.stringify(error)}`,
    };
  }
};
