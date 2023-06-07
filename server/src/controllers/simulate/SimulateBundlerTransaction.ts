import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { userOpValidationServiceMap, entryPointMap } from '../../../../common/service-manager';
import { parseError } from '../../../../common/utils';
import { STATUSES } from '../../middleware';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const validateBundlerTransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId } = req.params;
    log.info(`chainId from request params: ${chainId}`);

    const entryPointContract = entryPointMap[parseInt(chainId, 10)][entryPointAddress];
    if (!entryPointContract) {
      return {
        code: STATUSES.BAD_REQUEST,
        message: 'Entry point not supported by Bundler',
      };
    }

    const response = await userOpValidationServiceMap[
      parseInt(chainId, 10)
    ].simulateValidation({ userOp, entryPointContract });

    log.info(`UserOp validation response: ${JSON.stringify(response)}`);

    // set userOpHash
    req.body.params[2] = await entryPointContract.getUserOpHash(userOp);
    log.info(`Transaction successfully simulated and validated for userOp: ${JSON.stringify(userOp)} on chainId: ${chainId}`);
    return {
      code: STATUSES.SUCCESS,
      message: 'User op successfully simulated and validated',
    };
  } catch (error) {
    log.error(`Error in Bundler user op simulation and validation ${parseError(error)}`);
    return {
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Error in Bundler user op simulation and validation ${parseError(error)}`,
    };
  }
};
