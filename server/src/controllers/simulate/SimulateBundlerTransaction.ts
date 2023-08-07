import { Request } from 'express';
import { logger } from '../../../../common/log-config';
import { bundlerSimulatonAndValidationServiceMap, entryPointMap } from '../../../../common/service-manager';
import { parseError } from '../../../../common/utils';
import { STATUSES } from '../../middleware';

const log = logger(module);

// eslint-disable-next-line consistent-return
export const validateBundlerTransaction = async (req: Request) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId, bundlerApiKey } = req.params;
    log.info(`chainId from request params: ${chainId}`);
    log.info(`bundlerApiKey from request params: ${bundlerApiKey}`);

    if (bundlerApiKey === 'nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44') {
      if (![5, 80001, 97, 1442, 421613, 420, 43113, 84531, 59140].includes(parseInt(chainId, 10))) {
        return {
          code: -32400,
          message: 'Api Key does not match with registered chainId',
        };
      }
    }

    const entryPointContracts = entryPointMap[parseInt(chainId, 10)];

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
        message: 'Entry point not supported by Bundler',
      };
    }

    const bundlerSimulationAndValidationResponse = await bundlerSimulatonAndValidationServiceMap[
      parseInt(chainId, 10)
    ].validateUserOperation(
      {
        userOp,
        entryPointContract,
        chainId: parseInt(chainId, 10),
      },
    );

    log.info(`Bundler simulation and validation response: ${JSON.stringify(bundlerSimulationAndValidationResponse)}`);

    const {
      code,
      message,
    } = bundlerSimulationAndValidationResponse;

    if (code !== STATUSES.SUCCESS) {
      return {
        code,
        message,
      };
    }
    req.body.params[2] = bundlerSimulationAndValidationResponse.data.totalGas;
    req.body.params[3] = bundlerSimulationAndValidationResponse.data.userOpHash;
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
