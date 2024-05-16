/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import {
  getUserOperationDao,
  getUserOpertionStateDao
} from "../../../../common/service-manager";
import { generateTransactionId, parseError } from "../../../../common/utils";
import { BLOCKCHAINS, UserOperationStateEnum } from "../../../../common/types";
import { BUNDLER_ERROR_CODES, STATUSES } from "../../shared/middleware";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * Method is responsible for preparing partial raw transaction,
 * calling bundling method and returning userOpHash
 * @param {Request} req
 * @param {Response} res
 * @returns JSON RPC Reponse with userOpHash
 */
export const bundleUserOperation = async (req: Request, res: Response) => {
  try {
    // performance tracker
    const start = performance.now();

    const { id } = req.body;
    const { chainId, dappAPIKey } = req.params;

    // TODO better handle these variables
    const userOp = req.body.params[0];
    const entryPointAddress = req.body.params[1];
    let gasLimitFromSimulation = req.body.params[2] + 500000;
    const userOpHash = req.body.params[3];

    const chainIdInNum = parseInt(chainId, 10);

    // Mantle Mainnet's gas estimation is never accurate and requires a high buffer
    if (chainIdInNum === BLOCKCHAINS.MANTA_MAINNET) {
      // TODO remove the below es lint
      // eslint-disable-next-line @typescript-eslint/no-unused-vars 
      gasLimitFromSimulation += 5000000000;
    }

    // a unique id linked to a particular transaction
    const transactionId = generateTransactionId(Date.now().toString());
    log.info(
      `transactionId: ${transactionId} for userOpHash: ${userOpHash} on chainId: ${chainIdInNum} for apiKey: ${dappAPIKey}`,
    );

    log.info(
      `Saving userOp state: ${UserOperationStateEnum.BUNDLER_MEMPOOL} for transactionId: ${transactionId} on chainId: ${chainIdInNum}`,
    );
    // saves initial user op state data linking the userOpHash with transactionId
    getUserOpertionStateDao().save(chainIdInNum, {
      transactionId,
      userOpHash,
      state: UserOperationStateEnum.BUNDLER_MEMPOOL,
    });

    // destructure userOp
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

    // gets paymster address from the paymaster and data
    const paymaster = `${paymasterAndData.substring(0, 42)}`;

    // saving inital userOp data
    getUserOperationDao().save(chainIdInNum, {
      transactionId,
      dappAPIKey,
      status: UserOperationStateEnum.BUNDLER_MEMPOOL,
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

    // call the bundle method of bundler comsumer to start bundling
    // TODO send to mempool
    // bundlerConsumerMap[chainIdInNum].bundle({
    //   to: entryPointAddress,
    //   data: "0x0",
    //   gasLimit: BigInt(gasLimitFromSimulation),
    //   chainId: chainIdInNum,
    //   value: "0x0",
    //   userOp,
    //   userOpHash,
    //   transactionId,
    // });

    const end = performance.now();
    log.info(`bundleUserOperation took: ${end - start} milliseconds`);
    return res.status(STATUSES.SUCCESS).json({
      jsonrpc: "2.0",
      id: id || 1,
      result: userOpHash,
    });
  } catch (error) {
    const { id } = req.body;
    log.error(`Error in bundle user op ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      jsonrpc: "2.0",
      id: id || 1,
      error: {
        code: BUNDLER_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: `Internal Server error: ${parseError(error)}`,
      },
    });
  }
};
