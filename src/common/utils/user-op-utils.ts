/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import {
  Log,
  PublicClient,
  TransactionReceipt,
  decodeEventLog,
  encodeAbiParameters,
  keccak256,
  parseAbiItem,
  parseAbiParameters,
  toHex,
} from "viem";
import { logger } from "../logger";
import {
  EntryPointContractType,
  EntryPointV07ContractType,
  StakeInfo,
  UserOperationType,
} from "../types";
import { parseError } from "./parse-error";
import { customJSONStringify } from "./custom-json-stringifier";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export const getPaymasterFromPaymasterAndData = (
  paymasterAndData: string,
): string => {
  const paymasterAddress = `${paymasterAndData.substring(0, 42)}`;
  log.info(
    `paymasterAddress: ${paymasterAddress} for paymasterAndData: ${paymasterAndData}`,
  );
  return paymasterAddress;
};

export const getPaymasterFromPaymasterAndDataV7 = (
  paymasterAndData: string,
): string => {
  if (!paymasterAndData) {
    return "";
  }
  const paymasterAddress = `${paymasterAndData.substring(0, 42)}`;
  log.info(
    `paymasterAddress: ${paymasterAddress} for paymasterAndData: ${paymasterAndData}`,
  );
  return paymasterAddress;
};

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

/**
 * Method is responsible for checking if the transaction was front runned
 * and to to return the correct user operation receipt
 * @param {number} chainId
 * @param {string} userOpHash
 * @param {TransactionReceipt} receipt
 * @param {EntryPointContractType} entryPointContract
 * @param {bigint} fromBlock
 * @param {PublicClient} provider
 */
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
      // get event logs from the underlying eth_getLogs RPC
      const userOperationEventLogs = await provider.getLogs({
        address: entryPointContract.address,
        event: parseAbiItem(
          "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
        ),
        args: {
          userOpHash: userOpHash as `0x${string}`,
        },
        fromBlock,
        toBlock: receipt.blockNumber,
      });

      // check if logs for the userOpHash are fetched in the given block range
      if (userOperationEventLogs.length === 0) {
        log.error(
          `error in getUserOperationReceipt: No user operation event logs found`,
        );
        return null;
      }

      // extract args from logs
      const { args } = userOperationEventLogs[0];

      if (args) {
        // start extracting all the necessary fields from args
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

        const { transactionHash } = userOperationEventLogs[0];
        let logs;
        // check if the transaction hash received in the receipt by Bundler is same
        // as the one received in the logs from userOpHas
        // if different it means some other transaction mined the transaction and hence
        // the transaction was front runned
        if (
          !(
            transactionHash.toLowerCase() ===
            receipt.transactionHash.toLowerCase()
          )
        ) {
          log.info(
            `Transaction for userOpHash: ${userOpHash} on chainId: ${chainId} was front runned`,
          );
          // get the receipt for the transaction that was front runned
          // for data saving and returning the correct userOp receipt
          const frontRunnedTransactionReceipt =
            (await provider.getTransactionReceipt({
              hash: transactionHash,
            })) as TransactionReceipt;
          logs = filterLogs(
            userOperationEventLogs[0],
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
        // if the transaction hash does not match then ideally this
        // piece of code should not be touched but filtering logs still
        logs = filterLogs(userOperationEventLogs[0], receipt.logs);
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
        `Missing/invalid userOpHash for userOpHash: ${userOpHash} on chainId: ${chainId} with error: ${parseError(
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
  entryPointContract: EntryPointContractType | EntryPointV07ContractType,
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

function encode(
  typevalues: Array<{ type: string; val: any }>,
  forSignature: boolean,
): string {
  const types = parseAbiParameters(
    typevalues
      .map((typevalue) =>
        typevalue.type === "bytes" && forSignature ? "bytes32" : typevalue.type,
      )
      .toString(),
  );
  const values = typevalues.map((typevalue: any) =>
    typevalue.type === "bytes" && forSignature
      ? keccak256(typevalue.val)
      : typevalue.val,
  );
  return encodeAbiParameters(types, values);
}

export const packUserOp = (
  userOp: UserOperationType,
  forSignature = true,
): string => {
  const userOpType = {
    components: [
      {
        type: "address",
        name: "sender",
      },
      {
        type: "uint256",
        name: "nonce",
      },
      {
        type: "bytes",
        name: "initCode",
      },
      {
        type: "bytes",
        name: "callData",
      },
      {
        type: "uint256",
        name: "callGasLimit",
      },
      {
        type: "uint256",
        name: "verificationGasLimit",
      },
      {
        type: "uint256",
        name: "preVerificationGas",
      },
      {
        type: "uint256",
        name: "maxFeePerGas",
      },
      {
        type: "uint256",
        name: "maxPriorityFeePerGas",
      },
      {
        type: "bytes",
        name: "paymasterAndData",
      },
      {
        type: "bytes",
        name: "signature",
      },
    ],
    name: "userOp",
    type: "tuple",
  };

  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack):
    // do encode a zero-length signature, but strip afterwards the appended zero-length value
    let encoded = encodeAbiParameters(
      [userOpType as any],
      [
        {
          ...userOp,
          signature: "0x",
        },
      ],
    );

    encoded = `0x${encoded.slice(66, encoded.length - 64)}`;
    return encoded;
  }

  const typevalues = (userOpType as any).components.map(
    (c: { name: keyof typeof userOp; type: string }) => ({
      type: c.type,
      val: userOp[c.name],
    }),
  );

  return encode(typevalues, forSignature);
};

export const getAddress = (data?: any): string | undefined => {
  if (data == null) {
    return undefined;
  }
  const str = toHex(data);
  if (str.length >= 42) {
    return str.slice(0, 42);
  }
  return undefined;
};

// extract address from "data" (first 20 bytes)
// add it as "addr" member to the "stakeinfo" struct
// if no address, then return "undefined" instead of struct.
export const fillEntity = (
  data: any,
  info: StakeInfo,
): StakeInfo | undefined => {
  const addr = getAddress(data);
  return addr == null
    ? undefined
    : {
        ...info,
        addr,
      };
};

/**
 * pack the userOperation
 * @param op
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function packUserOpForUserOpHash(
  op: Partial<UserOperationType>,
  forSignature = true,
): `0x${string}` {
  if (!op.initCode || !op.callData || !op.paymasterAndData)
    throw new Error("Missing userOp properties");

  if (forSignature) {
    return encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32",
      ),
      [
        op.sender as `0x${string}`,
        op.nonce as bigint,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit as bigint,
        op.verificationGasLimit as bigint,
        op.preVerificationGas as bigint,
        op.maxFeePerGas as bigint,
        op.maxPriorityFeePerGas as bigint,
        keccak256(op.paymasterAndData),
      ],
    );
  }
  // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
  return encodeAbiParameters(
    parseAbiParameters(
      "address, uint256, bytes, bytes, uint256, uint256, uint256, uint256, uint256, bytes, bytes",
    ),
    [
      op.sender as `0x${string}`,
      op.nonce as bigint,
      op.initCode,
      op.callData,
      op.callGasLimit as bigint,
      op.verificationGasLimit as bigint,
      op.preVerificationGas as bigint,
      op.maxFeePerGas as bigint,
      op.maxPriorityFeePerGas as bigint,
      op.paymasterAndData,
      op.signature as `0x${string}`,
    ],
  );
}
