/* eslint-disable import/no-import-module-exports */
import { Request, Response } from "express";
import { logger } from "../../../../common/logger";
import { relayerManagerTransactionTypeNameMap } from "../../../../common/maps";
import {
  EVMRelayerManagerMap,
  transactionDao,
  transactionServiceMap,
} from "../../../../common/service-manager";
import { TransactionType } from "../../../../common/types";
import { customJSONStringify, parseError } from "../../../../common/utils";
import { STATUSES } from "../../shared/middleware";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const transactionResubmitApi = async (req: Request, res: Response) => {
  const { chainId, transactionId, gasPrice } = req.body;

  // convert gas price to hex
  const gasPriceInHex = BigInt(`0x${parseInt(gasPrice, 10).toString(16)}`);

  const transactions = await transactionDao.getByTransactionId(
    chainId,
    transactionId,
  );
  try {
    if (transactions?.length !== 1) {
      return res.status(STATUSES.NOT_FOUND).json({
        code: STATUSES.NOT_FOUND,
        error: "Transaction not found",
      });
    }
    const transaction = transactions[0];
    log.info(
      `Transaction to be retried found of type ${transaction.transactionType}`,
    );
    // find the relayer that has initiated the transaction using EVMRelayerManager
    const relayerManagerName =
      relayerManagerTransactionTypeNameMap[
        transaction.transactionType as TransactionType
      ];
    log.info(`Relayer manager name: ${relayerManagerName}`);
    const relayer = EVMRelayerManagerMap[relayerManagerName][
      chainId
    ].getRelayer(transaction.relayerAddress);
    if (relayer) {
      const rawTransaction = {
        from: relayer.getPublicKey(),
        gasPrice: gasPriceInHex,
        gasLimit: transaction.rawTransaction.gasLimit._hex as `0x${string}`,
        to: transaction.rawTransaction.to as `0x${string}`,
        value: BigInt(transaction.rawTransaction.value._hex),
        data: transaction.rawTransaction.data as `0x${string}`,
        chainId,
        type: "0",
        nonce: transaction.rawTransaction.nonce,
      };
      log.info(
        `Resubmitting transaction ${transactionId} with gasPrice ${gasPrice} on chainId ${chainId} and raw transaction data ${customJSONStringify(
          rawTransaction,
        )}`,
      );
      const transactionExecutionResponse = await transactionServiceMap[
        chainId
      ].executeTransaction(
        {
          rawTransaction,
          account: relayer,
        },
        transactionId,
      );

      return res.json({
        code: STATUSES.SUCCESS,
        data: transactionExecutionResponse,
      });
    }

    return res.status(STATUSES.NOT_FOUND).json({
      code: STATUSES.NOT_FOUND,
      error: "Relayer not found",
    });
  } catch (error) {
    log.error(`Error in transaction resubmit ${parseError(error)}`);
    return res.status(STATUSES.INTERNAL_SERVER_ERROR).json({
      code: STATUSES.INTERNAL_SERVER_ERROR,
      error: parseError(error),
    });
  }
};
