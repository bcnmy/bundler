/* eslint-disable import/no-import-module-exports */
import {
  Log,
  PublicClient,
  TransactionReceipt,
  decodeEventLog,
  toHex,
} from "viem";
import { EntryPointContractType } from "../../../common/types";
import { customJSONStringify, parseError } from "../../../common/utils";
import { logger } from "../../../common/logger";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const filterLogs = (
  userOperationEventLogFromReceipt: Log,
  transactionLogs: Log[],
): Log[] => {
  const userOperationEventFilteredLog = transactionLogs.find(
    (transactionlog: any) => {
      if (
        transactionlog.topics.length ===
        userOperationEventLogFromReceipt.topics.length
      ) {
        // Sort the `topics` arrays and compare them element by element
        const sortedTransactionLogTopics = transactionlog.topics.slice().sort();
        const sortedTopicsArray = userOperationEventLogFromReceipt.topics
          .slice()
          .sort();
        return sortedTransactionLogTopics.every(
          (topic: string, index: number) => topic === sortedTopicsArray[index],
        );
      }
      return false;
    },
  );
  return [userOperationEventFilteredLog as Log];
};

export const getUserOperationReceiptForFailedTransaction = async (
  chainId: number,
  userOpHash: string,
  receipt: TransactionReceipt,
  entryPointContract: EntryPointContractType,
  fromBlock: bigint,
  provider: PublicClient,
): Promise<any> => {
  try {
    try {
      const filter = await provider.createEventFilter({
        address: entryPointContract.address,
        event: {
          name: "UserOperationEvent",
          type: "event",
          inputs: [
            {
              indexed: true,
              name: "userOpHash",
              type: "bytes32",
            },
            {
              indexed: true,
              name: "sender",
              type: "address",
            },
            {
              indexed: true,
              name: "paymaster",
              type: "address",
            },
            {
              indexed: false,
              name: "nonce",
              type: "uint256",
            },
            {
              indexed: false,
              name: "success",
              type: "bool",
            },
            {
              indexed: false,
              name: "actualGasCost",
              type: "uint256",
            },
            {
              indexed: false,
              name: "actualGasUsed",
              type: "uint256",
            },
          ],
        },
        fromBlock,
        toBlock: receipt.blockNumber,
      });

      const providerFilterLogs = await provider.getFilterLogs({ filter });

      const { args } = providerFilterLogs[0];

      log.info(
        `filter: ${customJSONStringify(
          filter,
        )} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
      );
      if (args) {
        const userOperationEventArgs = args;
        log.info(
          `userOperationEventArgs: ${customJSONStringify(
            userOperationEventArgs,
          )}`,
        );
        const actualGasCostInHex = toHex(args.actualGasCost as bigint);
        log.info(
          `actualGasCostInHex: ${actualGasCostInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasCostInNumber = Number(actualGasCostInHex);
        log.info(
          `actualGasCostInNumber: ${actualGasCostInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasUsedInHex = toHex(args.actualGasUsed as bigint);
        log.info(
          `actualGasUsedInHex: ${actualGasUsedInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasUsedInNumber = Number(actualGasUsedInHex);
        log.info(
          `actualGasUsedInNumber: ${actualGasUsedInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );

        const { transactionHash } = providerFilterLogs[0];
        let logs;
        if (
          !(
            transactionHash.toLowerCase() ===
            receipt.transactionHash.toLowerCase()
          )
        ) {
          log.info(
            `Transaction for userOpHash: ${userOpHash} on chainId: ${chainId} was front runned`,
          );
          const frontRunnedTransactionReceipt =
            (await provider.getTransactionReceipt({
              hash: transactionHash,
            })) as TransactionReceipt;
          logs = filterLogs(
            providerFilterLogs[0],
            frontRunnedTransactionReceipt.logs,
          );
          log.info(
            `logs: ${customJSONStringify(
              logs,
            )} for userOpHash: ${userOpHash} on chainId: ${chainId}`,
          );
          return {
            actualGasCost: actualGasCostInNumber,
            actualGasUsed: actualGasUsedInNumber,
            success: args.success,
            logs,
            frontRunnedTransactionReceipt,
          };
        }
        logs = filterLogs(providerFilterLogs[0], receipt.logs);
        log.info(
          `logs: ${customJSONStringify(
            logs,
          )} for userOpHash: ${userOpHash} on chainId: ${chainId}`,
        );
        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success: args.success,
          logs,
          frontRunnedTransactionReceipt: null,
        };
      }
      log.info("No event found");
      return null;
    } catch (error) {
      log.error(
        `Missing/invalid userOpHash for userOpHash: ${userOpHash} on chainId: ${chainId} with erro: ${parseError(
          error,
        )}`,
      );
      return null;
    }
  } catch (error) {
    log.error(`error in getUserOperationReceipt: ${parseError(error)}`);
    return null;
  }
};

export const getUserOperationReceiptForSuccessfulTransaction = async (
  chainId: number,
  userOpHash: string,
  receipt: TransactionReceipt,
  entryPointContract: EntryPointContractType,
  // eslint-disable-next-line consistent-return
): Promise<{
  actualGasCost: number;
  actualGasUsed: number;
  success: boolean;
  reason: string;
  logs: Log[];
} | null> => {
  try {
    const { logs } = receipt;
    for (const eventLog of logs) {
      if (
        eventLog.topics[0] ===
        "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f"
      ) {
        const userOperationEventLog = eventLog;
        const userOperationEvent = decodeEventLog({
          abi: entryPointContract.abi,
          topics: userOperationEventLog.topics,
          data: userOperationEventLog.data,
        });

        if (userOperationEvent.eventName !== "UserOperationEvent") {
          log.error(
            "error in getUserOperationReceipt: UserOperationEvent not found",
          );
          return null;
        }

        const { args } = userOperationEvent;

        const actualGasCostInHex = args.actualGasCost;
        log.info(
          `actualGasCostInHex: ${actualGasCostInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasCostInNumber = Number(actualGasCostInHex.toString());
        log.info(
          `actualGasCostInNumber: ${actualGasCostInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasUsedInHex = args.actualGasUsed;
        log.info(
          `actualGasUsedInHex: ${actualGasUsedInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const actualGasUsedInNumber = Number(actualGasUsedInHex.toString());
        log.info(
          `actualGasUsedInNumber: ${actualGasUsedInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const { success } = args;
        log.info(
          `success: ${success} for userOpHash: ${userOpHash} and chainId: ${chainId}`,
        );
        const userOperationLogs = filterLogs(eventLog, receipt.logs);
        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success,
          logs: userOperationLogs,
          reason: "",
        };
      }
    }
    return null;
  } catch (error) {
    log.error(`error in getUserOperationReceipt: ${parseError(error)}`);
    return null;
  }
};
