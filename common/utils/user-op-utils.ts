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
  parseAbiParameters,
  toHex,
} from 'viem';
import { config } from '../../config';
import { logger } from '../logger';
import {
  EntryPointContractType,
  StakeInfo, UserOperationType,
} from '../types';
import { parseError } from './parse-error';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const getPaymasterFromPaymasterAndData = (paymasterAndData: string): string => {
  const paymasterAddress = `${paymasterAndData.substring(0, 42)}`;
  log.info(`paymasterAddress: ${paymasterAddress} for paymasterAndData: ${paymasterAndData}`);
  return paymasterAddress;
};

const filterLogs = (
  userOpEvent: any,
  logs: Log<bigint, number, false>[],
): Log[] => {
  const userOpLogs = logs.find((transactionlog: any) => {
    if (transactionlog.topics.length === userOpEvent.topics.length) {
      // Sort the `topics` arrays and compare them element by element
      const sortedTransactionLogTopics = transactionlog.topics.slice().sort();
      const sortedTopicsArray = userOpEvent.topics.slice().sort();
      return sortedTransactionLogTopics.every(
        (topic: string, index: number) => topic === sortedTopicsArray[index],
      );
    }
    return false;
  });
  return [userOpLogs as Log];
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
          name: 'UserOperationEvent',
          type: 'event',
          inputs: [{
            indexed: true, name: 'userOpHash', type: 'bytes32',
          }, {
            indexed: true, name: 'sender', type: 'address',
          }, {
            indexed: true, name: 'paymaster', type: 'address',
          }, {
            indexed: false, name: 'nonce', type: 'uint256',
          }, {
            indexed: false, name: 'success', type: 'bool',
          }, {
            indexed: false, name: 'actualGasCost', type: 'uint256',
          }, {
            indexed: false, name: 'actualGasUsed', type: 'uint256',
          }],
        },
        fromBlock,
        toBlock: receipt.blockNumber,
      });

      const providerFilterLogs = await provider.getFilterLogs({ filter });

      const {
        args,
      } = providerFilterLogs[0];

      log.info(`filter: ${JSON.stringify(filter)} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
      if (args) {
        const userOperationEventArgs = args;
        log.info(`userOperationEventArgs: ${JSON.stringify(userOperationEventArgs)}`);
        const actualGasCostInHex = toHex(args.actualGasCost as bigint);
        log.info(`actualGasCostInHex: ${actualGasCostInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasCostInNumber = Number((actualGasCostInHex));
        log.info(`actualGasCostInNumber: ${actualGasCostInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInHex = toHex(args.actualGasUsed as bigint);
        log.info(`actualGasUsedInHex: ${actualGasUsedInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInNumber = Number(actualGasUsedInHex);
        log.info(`actualGasUsedInNumber: ${actualGasUsedInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);

        const { transactionHash } = providerFilterLogs[0];
        let logs;
        if (!(transactionHash.toLowerCase() === receipt.transactionHash.toLowerCase())) {
          log.info(`Transaction for userOpHash: ${userOpHash} on chainId: ${chainId} was front runned`);
          const frontRunnedTransactionReceipt = await provider.getTransactionReceipt({
            hash: transactionHash,
          }) as TransactionReceipt;
          logs = filterLogs(providerFilterLogs[0], frontRunnedTransactionReceipt.logs);
          log.info(`logs: ${JSON.stringify(logs)} for userOpHash: ${userOpHash} on chainId: ${chainId}`);
          return {
            actualGasCost: actualGasCostInNumber,
            actualGasUsed: actualGasUsedInNumber,
            success: args.success,
            logs,
            frontRunnedTransactionReceipt,
          };
        }
        logs = filterLogs(providerFilterLogs[0], receipt.logs);
        log.info(`logs: ${JSON.stringify(logs)} for userOpHash: ${userOpHash} on chainId: ${chainId}`);
        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success: args.success,
          logs,
          frontRunnedTransactionReceipt: null,
        };
      }
      log.info('No event found');
      return null;
    } catch (error) {
      log.error(`Missing/invalid userOpHash for userOpHash: ${userOpHash} on chainId: ${chainId} with erro: ${parseError(error)}`);
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
): Promise<any> => {
  try {
    const { logs } = receipt;
    for (const eventLog of logs) {
      // TODO get topicId for UserOperationEvent from config
      if (eventLog.topics[0] === '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f' && eventLog.topics[0].toLowerCase() === userOpHash.toLowerCase()) {
        const userOperationEventLog = eventLog;
        const userOperationEvent = decodeEventLog({
          abi: entryPointContract.abi,
          topics: userOperationEventLog.topics,
          data: userOperationEventLog.data,
        });

        if (userOperationEvent.eventName !== 'UserOperationEvent') {
          log.error('error in getUserOperationReceipt: UserOperationEvent not found');
          return null;
        }

        const { args } = userOperationEvent;

        const actualGasCostInHex = args.actualGasCost;
        log.info(`actualGasCostInHex: ${actualGasCostInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasCostInNumber = Number(actualGasCostInHex.toString());
        log.info(`actualGasCostInNumber: ${actualGasCostInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInHex = args.actualGasUsed;
        log.info(`actualGasUsedInHex: ${actualGasUsedInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInNumber = Number(actualGasUsedInHex.toString());
        log.info(`actualGasUsedInNumber: ${actualGasUsedInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const { success } = args;
        log.info(`success: ${success} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const userOperationLogs = filterLogs(
          userOperationEvent as any, // TODO fix types
          receipt.logs,
        );
        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success,
          logs: userOperationLogs,
        };
        break;
      }
    }
  } catch (error) {
    log.error(`error in getUserOperationReceipt: ${parseError(error)}`);
    return null;
  }
};

function encode(
  typevalues: Array<{ type: string; val: any }>,
  forSignature: boolean,
): string {
  const types = parseAbiParameters(typevalues.map((typevalue) => (typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type)).toString());
  const values = typevalues.map((typevalue: any) => (typevalue.type === 'bytes' && forSignature
    ? keccak256(typevalue.val)
    : typevalue.val));
  return encodeAbiParameters(types, values);
}

const UserOpType = config.abi.entryPointAbi.find(
  (entry: any) => entry.name === 'simulateValidation',
)?.inputs?.[0];

export const packUserOp = (
  userOp: UserOperationType,
  forSignature = true,
): string => {
  if (forSignature) {
    // lighter signature scheme (must match UserOperation#pack):
    // do encode a zero-length signature, but strip afterwards the appended zero-length value
    const userOpType = {
      components: [
        {
          type: 'address',
          name: 'sender',
        },
        {
          type: 'uint256',
          name: 'nonce',
        },
        {
          type: 'bytes',
          name: 'initCode',
        },
        {
          type: 'bytes',
          name: 'callData',
        },
        {
          type: 'uint256',
          name: 'callGasLimit',
        },
        {
          type: 'uint256',
          name: 'verificationGasLimit',
        },
        {
          type: 'uint256',
          name: 'preVerificationGas',
        },
        {
          type: 'uint256',
          name: 'maxFeePerGas',
        },
        {
          type: 'uint256',
          name: 'maxPriorityFeePerGas',
        },
        {
          type: 'bytes',
          name: 'paymasterAndData',
        },
        {
          type: 'bytes',
          name: 'signature',
        },
      ],
      name: 'userOp',
      type: 'tuple',
    };

    let encoded = encodeAbiParameters(
      [userOpType as any],
      [
        {
          ...userOp,
          signature: '0x',
        },
      ],
    );

    encoded = `0x${encoded.slice(66, encoded.length - 64)}`;
    return encoded;
  }

  const typevalues = (UserOpType as any).components.map(
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
export const fillEntity = (data: any, info: StakeInfo): StakeInfo | undefined => {
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
  if (!op.initCode || !op.callData || !op.paymasterAndData) throw new Error('Missing userOp properties');

  if (forSignature) {
    return encodeAbiParameters(
      parseAbiParameters("'address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'"),
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        keccak256(op.paymasterAndData),
      ],
    );
  }
  // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
  return encodeAbiParameters(
    parseAbiParameters("'address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes"),
    [
      op.sender,
      op.nonce,
      op.initCode,
      op.callData,
      op.callGasLimit,
      op.verificationGasLimit,
      op.preVerificationGas,
      op.maxFeePerGas,
      op.maxPriorityFeePerGas,
      op.paymasterAndData,
      op.signature,
    ],
  );
}
