import { Request, Response } from 'express';
import { logger } from '../../../../../common/log-config';
import {
  mempoolManagerMap, routeTransactionToRelayerMap, userOperationDao,
} from '../../../../../common/service-manager';
import { getPaymasterFromPaymasterAndData, parseError } from '../../../../../common/utils';
import {
  isError,
  TransactionStatus,
  TransactionType,
} from '../../../../../common/types';
import { STATUSES } from '../../../middleware';

const log = logger(module);

export const addUserOperationToMempool = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const userOpHash = req.body.params[2];
    const { chainId } = req.params;
    const chainIdInNum = parseInt(chainId, 10);

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature,
    } = userOp;

    // TODO event also emits paymaster
    const paymaster = getPaymasterFromPaymasterAndData(paymasterAndData);

    if (!routeTransactionToRelayerMap[chainIdInNum][TransactionType.BUNDLER]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
      });
    }
    const response = await mempoolManagerMap[chainIdInNum][entryPointAddress].addUserOp(
      userOp,
      userOpHash,
    );

    userOperationDao.save(chainIdInNum, {
      status: TransactionStatus.PENDING,
      entryPoint: entryPointAddress,
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature,
      userOpHash,
      chainId: chainIdInNum,
      paymaster,
      creationTime: Date.now(),
    });

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: 1, // TODO change to sequential id
      result: userOpHash,
    });
  } catch (error) {
    log.error(`Error in adding user operation to mempool ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
