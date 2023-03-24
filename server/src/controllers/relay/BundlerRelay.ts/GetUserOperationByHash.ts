import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { userOperationDao } from '../../../../../common/service-manager';

const log = logger(module);

/**
 * null in case the UserOperation is not yet included in a block,
 * or a full UserOperation, with
 * the addition of entryPoint, blockNumber, blockHash and transactionHash
 */
export const getUserOperationByHash = async (req: Request, res: Response) => {
  try {
    const { chainId } = req.params;
    const userOpHash = req.body.params[0];

    const userOperation = await userOperationDao.getUserOperationDataByUserOpHash(
      parseInt(chainId, 10),
      userOpHash,
    );

    if (!userOperation) {
      return {
        jsonrpc: '2.0',
        id: 1,
        result: null,
      };
    }

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      preVerificationGas,
      verificationGasLimit,
      paymasterAndData,
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature,
      transactionHash,
      blockNumber,
      blockHash,
    } = userOperation;

    const result = {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      preVerificationGas,
      verificationGasLimit,
      paymasterAndData,
      maxFeePerGas,
      maxPriorityFeePerGas,
      signature,
      transactionHash,
      blockNumber,
      blockHash,
    };

    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: 1,
      result,
    });
  } catch (error) {
    log.error(`Error in supportedEntryPoints handler ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};
