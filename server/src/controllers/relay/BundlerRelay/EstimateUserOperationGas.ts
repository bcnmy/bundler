import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { bundlerValidationServiceMap, entryPointMap } from '../../../../../common/service-manager';
import { parseError } from '../../../../../common/utils';

const log = logger(module);

export const estimateUserOperationGas = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const { chainId } = req.params;

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

    const estimatedUserOpGas = await bundlerValidationServiceMap[
      parseInt(chainId, 10)
    ].estimateUserOperationGas({ userOp, entryPointContract, chainId: parseInt(chainId, 10) });

    const {
      code,
      message,
      data,
    } = estimatedUserOpGas;

    if (code !== STATUSES.SUCCESS) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: code || STATUSES.BAD_REQUEST,
        message,
      });
    }

    const {
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      validUntil,
      validAfter,
      deadline,
    } = data;

    return res.status(STATUSES.BAD_REQUEST).json({
      jsonrpc: '2.0',
      id: 1,
      result: {
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        validUntil,
        validAfter,
        deadline,
      },
    });
  } catch (error) {
    log.error(`Error in estimateUserOperationGas handler ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
