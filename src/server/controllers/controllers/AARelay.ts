/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { logger } from "../../../common/logger";
import {
  routeTransactionToRelayerMap,
  transactionDao,
  userOperationDao,
} from "../../../common/service-manager";
import {
  customJSONStringify,
  generateTransactionId,
  getPaymasterFromPaymasterAndData,
  parseError,
} from "../../../common/utils";
import {
  isError,
  RelayerDestinationSmartContractName,
  TransactionMethodType,
  TransactionStatus,
  TransactionType,
} from "../../../common/types";
import { config } from "../../../config";
import { STATUSES } from "../../middleware";

const websocketUrl = config.socketService.wssUrl;

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const relayAATransaction = async (req: Request, res: Response) => {
  try {
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    const chainId = req.body.params[2];
    const metaData = req.body.params[3];
    const gasLimitFromSimulation = req.body.params[4]
      ? `0x${(req.body.params[4] + 500000).toString(16)}`
      : `0x${(1000000).toString(16)}`;
    const userOpHash = req.body.params[5];

    const transactionId = generateTransactionId(Date.now().toString());
    const walletAddress = userOp.sender.toLowerCase();

    await transactionDao.save(chainId, {
      transactionId,
      transactionType: TransactionType.AA,
      status: TransactionStatus.PENDING,
      chainId,
      walletAddress,
      relayerDestinationContractAddress: entryPointAddress,
      relayerDestinationContractName:
        RelayerDestinationSmartContractName.ENTRY_POINT,
      resubmitted: false,
      creationTime: Date.now(),
    });

    if (!routeTransactionToRelayerMap[chainId][TransactionType.AA]) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: `${TransactionMethodType.AA} method not supported for chainId: ${chainId}`,
      });
    }
    const response = routeTransactionToRelayerMap[chainId][
      TransactionType.AA
    ].sendTransactionToRelayer({
      type: TransactionType.AA,
      to: entryPointAddress,
      data: "0x0",
      gasLimit: gasLimitFromSimulation,
      chainId,
      value: "0x0",
      userOp,
      transactionId,
      walletAddress,
      metaData,
    });

    try {
      const { dappAPIKey } = metaData;
      log.info(
        `dappAPIKey: ${dappAPIKey} for userOp: ${customJSONStringify(userOp)}`,
      );
      // const {
      //   destinationSmartContractAddresses,
      //   destinationSmartContractMethods,
      // } = await getMetaDataFromUserOp(
      //   userOp,
      //   chainId,
      //   dappAPIKey,
      //   networkServiceMap[chainId].provider,
      // );
      // metaData.destinationSmartContractAddresses = destinationSmartContractAddresses;
      // metaData.destinationSmartContractMethods = destinationSmartContractMethods;
      log.info(
        `MetaData to be saved: ${customJSONStringify(
          metaData,
        )} for dappAPIKey: ${dappAPIKey}`,
      );

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

      userOperationDao.save(chainId, {
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
        chainId,
        paymaster,
        metaData,
        creationTime: Date.now(),
      });
    } catch (error) {
      log.error(
        `Error in getting meta data from userOp: ${customJSONStringify(
          userOp,
        )}`,
      );
      log.error(`Error: ${error}`);
    }

    if (isError(response)) {
      return res.status(STATUSES.BAD_REQUEST).json({
        code: STATUSES.BAD_REQUEST,
        error: response.error,
      });
    }
    return res.status(STATUSES.SUCCESS).json({
      code: STATUSES.SUCCESS,
      data: {
        transactionId,
        connectionUrl: websocketUrl,
      },
    });
  } catch (error) {
    log.error(`Error in AA relay ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: `Internal Server Error: ${parseError(error)}`,
    });
  }
};
