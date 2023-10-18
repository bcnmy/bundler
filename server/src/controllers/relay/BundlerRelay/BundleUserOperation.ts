/* eslint-disable import/no-import-module-exports */
import { Request, Response } from 'express';
import { logger } from '../../../../../common/logger';
import {
  routeTransactionToRelayerMap, transactionDao, userOperationDao, userOperationStateDao,
} from '../../../../../common/service-manager';
import { generateTransactionId, getPaymasterFromPaymasterAndData, parseError } from '../../../../../common/utils';
import {
  isError,
  TransactionStatus,
  TransactionType,
  UserOperationStateEnum,
} from '../../../../../common/types';
import { BUNDLER_VALIDATION_STATUSES, STATUSES } from '../../../middleware';
// import { updateRequest } from '../../auth/UpdateRequest';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const bundleUserOperation = async (req: Request, res: Response) => {
  // const bundlerRequestId = req.body.params[6];

  try {
    const start = performance.now();
    const { id } = req.body;
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const gasLimitFromSimulation = req.body.params[2] + 200000;
    const userOpHash = req.body.params[3];
    const { chainId, dappAPIKey } = req.params;

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

    log.info(`Saving userOp state: ${UserOperationStateEnum.BUNDLER_MEMPOOL} for transactionId: ${transactionId} on chainId: ${chainIdInNum}`);
    userOperationStateDao.save(chainIdInNum, {
      transactionId,
      userOpHash,
      state: UserOperationStateEnum.BUNDLER_MEMPOOL,
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

    const paymaster = getPaymasterFromPaymasterAndData(paymasterAndData);

    userOperationDao.save(chainIdInNum, {
      transactionId,
      dappAPIKey,
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
      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   transactionId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     error: {
      //       code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      //       message: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
      //     },
      //   },
      //   httpResponseCode: STATUSES.BAD_REQUEST,
      // });
      const end = performance.now();
      log.info(`bundleUserOperation took: ${end - start} milliseconds`);
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
          message: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
        },
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
      // updateRequest({
      //   chainId: parseInt(chainId, 10),
      //   apiKey,
      //   bundlerRequestId,
      //   transactionId,
      //   rawResponse: {
      //     jsonrpc: '2.0',
      //     id: id || 1,
      //     error: {
      //       code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
      //       message: response.error,
      //     },
      //   },
      //   httpResponseCode: STATUSES.BAD_REQUEST,
      // });
      const end = performance.now();
      log.info(`bundleUserOperation took: ${end - start} milliseconds`);
      return res.status(STATUSES.BAD_REQUEST).json({
        jsonrpc: '2.0',
        id: id || 1,
        error: {
          code: BUNDLER_VALIDATION_STATUSES.BAD_REQUEST,
          message: response.error,
        },
      });
    }

    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   transactionId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     result: userOpHash,
    //   },
    //   httpResponseCode: STATUSES.SUCCESS,
    // });
    const end = performance.now();
    log.info(`bundleUserOperation took: ${end - start} milliseconds`);
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: userOpHash,
    });
  } catch (error) {
    const { id } = req.body;
    log.error(`Error in bundle user op ${parseError(error)}`);
    // updateRequest({
    //   chainId: parseInt(chainId, 10),
    //   apiKey,
    //   bundlerRequestId,
    //   rawResponse: {
    //     jsonrpc: '2.0',
    //     id: id || 1,
    //     error: {
    //       code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
    //       message: `Internal Server error: ${parseError(error)}`,
    //     },
    //   },
    //   httpResponseCode: STATUSES.INTERNAL_SERVER_ERROR,
    // });
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: '2.0',
      id: id || 1,
      error: {
        code: BUNDLER_VALIDATION_STATUSES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
