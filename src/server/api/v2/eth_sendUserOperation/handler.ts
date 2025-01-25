import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  routeTransactionToRelayerMap,
  transactionDao,
  userOperationDao,
  userOperationStateDao,
} from "../../../../common/service-manager";
import config from "config";
import {
  getPaymasterFromPaymasterAndData,
  parseError,
  uniqueRequestId,
  uniqueTransactonId,
} from "../../../../common/utils";
import {
  isError,
  TransactionStatus,
  TransactionType,
  UserOperationStateEnum,
} from "../../../../common/types";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";
import { logMeasureTime } from "../../../../common/utils/timing";
import { Address } from "viem";
import pino from "pino";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * Sends the user operation to the entrypoint contract as per the ERC-4337 spec
 * @param req - The request object
 * @param res - The response object
 * @returns The response object
 */
export const eth_sendUserOperation = async (req: Request, res: Response) => {
  const requestId = req.body.id != null ? req.body.id : uniqueRequestId();
  const { chainId, dappAPIKey } = req.params;
  const chainIdNumber = parseInt(chainId, 10);
  const transactionId = uniqueTransactonId();
  const [userOp, entryPointAddress, gasLimitFromSimulation, userOpHash] =
    req.body.params;

  const _log = log.child({
    chainId: chainIdNumber,
    dappAPIKey,
    requestId,
    transactionId,
    entryPointAddress,
  });

  try {
    _log.info(`eth_sendUserOperation: received userOpHash: ${userOpHash}`);

    logMeasureTime(_log, "eth_sendUserOperation", async () => {
      const walletAddress = userOp.sender.toLowerCase();

      await saveInitialTransaction(
        _log,
        chainIdNumber,
        transactionId,
        walletAddress,
      );

      await saveInitialUserOperationState(
        _log,
        chainIdNumber,
        transactionId,
        userOpHash,
      );

      await saveInitialUserOperation(
        _log,
        transactionId,
        dappAPIKey,
        entryPointAddress,
        userOpHash,
        chainIdNumber,
        userOp,
      );

      const relayService =
        routeTransactionToRelayerMap[chainIdNumber][TransactionType.BUNDLER];

      if (!relayService) {
        return res.status(STATUSES.BAD_REQUEST).json({
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: BUNDLER_ERROR_CODES.BAD_REQUEST,
            message: `${TransactionType.BUNDLER} method not supported for chainId: ${chainId}`,
          },
        });
      }

      let gasLimit = gasLimitFromSimulation;

      // Add 5 Gwei to the gasLimit for MANTLE_MAINNET (for some reason?)
      if (chainIdNumber === 5000) {
        gasLimit += 5e9;
      }

      // Add a markup to the gas limit if specified in the config
      const configKey = `callGasLimitMarkup.${chainId}`;
      if (config.has(configKey)) {
        _log.info(
          `Adding gas limit markup of ${config.get<number>(configKey)}`,
        );
        gasLimit += config.get<number>(configKey);
      }

      const response = routeTransactionToRelayerMap[chainIdNumber][
        TransactionType.BUNDLER
      ].sendUserOperation({
        type: TransactionType.BUNDLER,
        to: entryPointAddress,
        data: "0x0",
        gasLimit: `0x${Number(gasLimit).toString(16)}`,
        chainId: chainIdNumber,
        value: "0x0",
        userOp,
        transactionId,
        walletAddress,
      });

      if (isError(response)) {
        return res.status(STATUSES.BAD_REQUEST).json({
          jsonrpc: "2.0",
          id: requestId,
          error: {
            code: BUNDLER_ERROR_CODES.BAD_REQUEST,
            message: response.error,
          },
        });
      }

      return res.status(STATUSES.SUCCESS).json({
        jsonrpc: "2.0",
        id: requestId,
        result: userOpHash,
      });
    });
  } catch (err) {
    _log.error({ err }, `eth_sendUserOperation: Unexpected error`);

    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(err)}`,
      },
    });
  }
};

/**
 * Saves the initial user operation state in the database
 * @param _log Child logger with request specific data
 * @param chainIdNumber Chain id number
 * @param transactionId Unique transaction id
 * @param userOpHash Hash of the user operation
 */
async function saveInitialUserOperationState(
  _log: pino.Logger,
  chainIdNumber: number,
  transactionId: string,
  userOpHash: string,
) {
  _log.info(
    `Saving userOp state: ${UserOperationStateEnum.BUNDLER_MEMPOOL} for transactionId: ${transactionId}`,
  );

  return userOperationStateDao.save(chainIdNumber, {
    transactionId,
    userOpHash,
    state: UserOperationStateEnum.BUNDLER_MEMPOOL,
  });
}

/**
 * Saves the initial transaction in the database
 * @param _log Child logger with request specific data
 * @param chainIdNumber Chain id number
 * @param transactionId Unique transaction id
 * @param walletAddress Wallet address
 */
async function saveInitialTransaction(
  _log: pino.Logger,
  chainIdNumber: number,
  transactionId: string,
  walletAddress: Address,
) {
  const data = {
    transactionId,
    transactionType: TransactionType.BUNDLER,
    status: TransactionStatus.PENDING,
    chainId: chainIdNumber,
    walletAddress,
    resubmitted: false,
    creationTime: Date.now(),
  };

  _log.info(`Saving pending transaction: ${JSON.stringify(data)}`);

  return transactionDao.save(chainIdNumber, data);
}

/**
 *
 * @param _log Child logger with request specific data
 * @param transactionId Unique transaction id
 * @param dappAPIKey Dapp API key
 * @param entryPointAddress Address of the entry point
 * @param userOpHash Hash of the user operation
 * @param chainId Chain id
 * @param userOperation User operation object
 */
async function saveInitialUserOperation(
  _log: pino.Logger,
  transactionId: string,
  dappAPIKey: string,
  entryPointAddress: Address,
  userOpHash: string,
  chainId: number,
  // TODO: Add interface type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userOperation: any,
) {
  const { paymasterAndData } = userOperation;
  const paymaster = getPaymasterFromPaymasterAndData(paymasterAndData);

  _log.info(
    `Saving initial userOperation with userOpHash: ${userOpHash} and paymaster: ${paymaster}`,
  );

  userOperationDao.save(chainId, {
    transactionId,
    dappAPIKey,
    status: TransactionStatus.PENDING,
    entryPoint: entryPointAddress,
    userOpHash,
    chainId,
    paymaster,
    creationTime: Date.now(),
    ...userOperation,
  });
}
