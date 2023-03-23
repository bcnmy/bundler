import { Request, Response } from 'express';
import { logger } from '../../../../../common/log-config';
import { routeTransactionToRelayerMap, transactionDao, userOperationDao } from '../../../../../common/service-manager';
import { generateTransactionId, getPaymasterFromPaymasterAndData } from '../../../../../common/utils';
import {
  isError,
  TransactionStatus,
  TransactionType,
} from '../../../../../common/types';
import { STATUSES } from '../../../middleware';

const log = logger(module);

export const bundleUserOperation = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const gasLimitFromSimulation = req.body.params[2];
    const userOpHash = req.body.params[3];
    const { chainId } = req.params;
    const chainIdInNum = parseInt(chainId, 10);

    const transactionId = generateTransactionId(userOp);

    const walletAddress = userOp.sender.toLowerCase();

    transactionDao.save(chainIdInNum, {
      transactionId,
      transactionType: TransactionType.BUNDLER,
      status: TransactionStatus.PENDING,
      chainId: chainIdInNum,
      walletAddress,
      resubmitted: false,
      creationTime: Date.now(),
    });

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

    userOperationDao.save(chainIdInNum, {
      transactionId,
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

    if (!routeTransactionToRelayerMap[chainIdInNum][TransactionType.BUNDLER]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
      });
    }
    const response = routeTransactionToRelayerMap[chainIdInNum][TransactionType.BUNDLER]
      .sendTransactionToRelayer({
        type: TransactionType.BUNDLER,
        to: entryPointAddress,
        data: '0x0',
        gasLimit: `0x${Number(gasLimitFromSimulation).toString(16)}`,
        chainId: chainIdInNum,
        value: '0x0',
        userOp,
        transactionId,
        walletAddress,
      });

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: 1,
      result: userOpHash,
    });
  } catch (error) {
    log.error(`Error in bundle user op ${JSON.stringify(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${JSON.stringify(error)}`,
    });
  }
};