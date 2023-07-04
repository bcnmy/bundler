import { Request, Response } from 'express';
import { STATUSES } from '../../../middleware';
import { logger } from '../../../../../common/log-config';
import { userOperationDao } from '../../../../../common/service-manager';
import { parseError } from '../../../../../common/utils';

const log = logger(module);

/**
 * null in case the UserOperation is not yet included in a block,
 * or a full UserOperation, with
 * the addition of entryPoint, blockNumber, blockHash and transactionHash
 */
export const getUserOperationByHash = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const { chainId } = req.params;
    const userOpHash = req.body.params[0];

    const userOperation = await userOperationDao.getUserOperationDataByUserOpHash(
      parseInt(chainId, 10),
      userOpHash,
    );

    if (!userOperation || !userOperation.transactionHash) {
      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: '2.0',
        id: id || 1,
        result: null,
      });
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
      entryPoint,
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
      entryPoint,
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
    const { id } = req.body;
    log.error(`Error in getUserOperationByHash handler ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
