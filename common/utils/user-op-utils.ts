/* eslint-disable import/no-import-module-exports */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import { ethers } from 'ethers';
import {
  BytesLike, defaultAbiCoder, hexlify, keccak256,
} from 'ethers/lib/utils';
import { config } from '../../config';
import { STATUSES } from '../../server/src/middleware';
import { logger } from '../logger';
import {
  GetMetaDataFromUserOpReturnType, Log, StakeInfo, UserOperationEventEvent, UserOperationType,
} from '../types';
import { axiosPostCall } from './axios-calls';
import { parseError } from './parse-error';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export const getMetaDataFromUserOp = async (
  userOp: UserOperationType,
  chainId: number,
  dappAPIKey: string,
  ethersProvider: ethers.providers.JsonRpcProvider,
): Promise<GetMetaDataFromUserOpReturnType> => {
  try {
    const walletAddress = userOp.sender;
    log.info(`Extracting data for wallet address: ${walletAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    const destinationSmartContractAddresses: Array<string> = [];
    const destinationSmartContractMethodsCallData: Array<string> = [];
    const destinationSmartContractMethods: Array<{ address: string, name: string }> = [];
    const { smartWalletAbi } = config.abi;
    const multiSendContractAddress = config.chains.multiSendAddress[chainId];
    log.info(`Multi Send Contract Address: ${multiSendContractAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const { callData, sender } = userOp;
    const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
    const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction({ data: callData });
    log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const smartWalletExecFunctionName = decodedDataSmartWallet.name;
    log.info(`Name of smart wallet method: ${JSON.stringify(smartWalletExecFunctionName)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    if (smartWalletExecFunctionName === 'executeCall') {
      const methodArgsSmartWalletExecuteCall = decodedDataSmartWallet.args;
      if (!methodArgsSmartWalletExecuteCall) {
        log.info(`No value args found in decoded data of the smart wallet for executeCall for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecuteCall)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      if (!(methodArgsSmartWalletExecuteCall[0].toLowerCase() === sender.toLowerCase())) {
        log.info(`Destination address is not sender's wallet for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
        const targetContractCode = await ethersProvider.getCode(
          methodArgsSmartWalletExecuteCall[0],
        );
        log.info(`targetContractCode: ${targetContractCode} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
        if (!(targetContractCode === '0x')) {
          log.info(`Destination address is not EOA for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
          destinationSmartContractAddresses.push(methodArgsSmartWalletExecuteCall[0].toLowerCase());
          destinationSmartContractMethodsCallData.push(
            methodArgsSmartWalletExecuteCall[2].toLowerCase(),
          );
        }
      }
    } else if (smartWalletExecFunctionName === 'executeBatchCall') {
      const methodArgsSmartWalletExecuteBatchCall = decodedDataSmartWallet.args;
      if (!methodArgsSmartWalletExecuteBatchCall) {
        log.info(`No value args found in decoded data of the smart wallet for executeBatchCall for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecuteBatchCall)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      for (
        let index = 0;
        index < methodArgsSmartWalletExecuteBatchCall[0].length;
        index += 1
      ) {
        const targetContractCode = await ethersProvider.getCode(
          methodArgsSmartWalletExecuteBatchCall[0][index],
        );
        if (targetContractCode === '0x') {
          log.info(`Destination address is EOA for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
          continue;
        }
        if ((methodArgsSmartWalletExecuteBatchCall[0][index].toLowerCase()
          === sender.toLowerCase())) {
          log.info(`Destination address is sender's wallet for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
          continue;
        } else {
          destinationSmartContractAddresses.push(
            methodArgsSmartWalletExecuteBatchCall[0][index].toLowerCase(),
          );
          destinationSmartContractMethodsCallData.push(
            methodArgsSmartWalletExecuteBatchCall[2][index].toLowerCase(),
          );
        }
      }
    } else {
      log.info(`User op has call data of: ${smartWalletExecFunctionName} which is not supported for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      return {
        destinationSmartContractAddresses: [],
        destinationSmartContractMethods: [],
      };
    }

    log.info(`Destination Smart Contract Addresses for walletAddress: ${userOp.sender} are: ${destinationSmartContractAddresses} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Destination Smart Contract Methods call data for walletAddress: ${userOp.sender} are: ${destinationSmartContractMethodsCallData} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Getting smart contract data for addresses: ${JSON.stringify(destinationSmartContractAddresses)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Making call to paymaster dashboard backend to get data on ${config.paymasterDashboardBackendConfig.dappDataUrl} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const dataFromPaymasterDashboardBackend = await axiosPostCall(
      config.paymasterDashboardBackendConfig.dappDataUrl,
      {
        apiKey: dappAPIKey,
        smartContractAddresses: destinationSmartContractAddresses,
      },
    );
    log.info(`Respone from paymaster dashboard backend: ${JSON.stringify(dataFromPaymasterDashboardBackend)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    if (dataFromPaymasterDashboardBackend.statusCode !== STATUSES.SUCCESS) {
      throw dataFromPaymasterDashboardBackend.message;
    }
    const {
      dapp,
      smartContracts,
    } = dataFromPaymasterDashboardBackend.data;
    // const dappId = dapp._id;
    log.info(dataFromPaymasterDashboardBackend.data);

    log.info(`Data fetched for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Dapp: ${JSON.stringify(dapp)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Smart Contracts: ${JSON.stringify(smartContracts)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const smartContractsData = [];
    for (
      let smartContractDataIndex = 0;
      smartContractDataIndex < destinationSmartContractAddresses.length;
      smartContractDataIndex += 1
    ) {
      for (let smartContractIndex = 0;
        smartContractIndex < smartContracts.length;
        smartContractIndex += 1) {
        if (destinationSmartContractAddresses[smartContractDataIndex]
            === smartContracts[smartContractIndex].address) {
          smartContractsData.push(smartContracts[smartContractIndex]);
        }
      }
    }
    log.info(`Extracting data for: ${destinationSmartContractAddresses.length} contract method calls`);
    for (
      let smartContractDataIndex = 0;
      smartContractDataIndex < destinationSmartContractAddresses.length;
      smartContractDataIndex += 1
    ) {
      const { abi } = smartContractsData[smartContractDataIndex];
      const destinationSmartContractMethodCallData = destinationSmartContractMethodsCallData[
        smartContractDataIndex
      ];
      const iFaceSmartContract = new ethers.utils.Interface(abi);
      const decodedDataSmartContract = iFaceSmartContract.parseTransaction(
        { data: destinationSmartContractMethodCallData },
      );
      const methodNameSmartContract = decodedDataSmartContract.name;
      destinationSmartContractMethods.push({
        name: methodNameSmartContract,
        address: smartContractsData[smartContractDataIndex].address,
      });
    }

    log.info(`Destination Smart Contract Addresses: ${JSON.stringify(destinationSmartContractAddresses)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    log.info(`Destination Smart Contract Methods: ${JSON.stringify(destinationSmartContractMethods)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    return {
      destinationSmartContractAddresses,
      destinationSmartContractMethods,
    };
  } catch (error: any) {
    log.error(`Error in getting wallet transaction data for userOp: ${userOp} on chainId: ${chainId} with error: ${parseError(error)} for dappAPIKey: ${dappAPIKey}`);
    return {
      destinationSmartContractAddresses: [],
      destinationSmartContractMethods: [],
    };
  }
};

export const getPaymasterFromPaymasterAndData = (paymasterAndData: string): string => {
  const paymasterAddress = `${paymasterAndData.substring(0, 42)}`;
  log.info(`paymasterAddress: ${paymasterAddress} for paymasterAndData: ${paymasterAndData}`);
  return paymasterAddress;
};

const filterLogs = (userOpEvent: UserOperationEventEvent, logs: Log[]): Log[] => {
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

export const getUserOperationReceiptForDataSaving = async (
  chainId: number,
  userOpHash: string,
  receipt: any,
  entryPointContract: ethers.Contract,
  fromBlock: number,
  ethersProvider?: ethers.providers.JsonRpcProvider,
): Promise<any> => {
  try {
    let event = [];
    try {
      // TODO add from and to block
      event = await entryPointContract.queryFilter(
        entryPointContract.filters.UserOperationEvent(userOpHash),
        fromBlock,
      ) as any;
      log.info(`event: ${JSON.stringify(event)} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
      if (event[0]) {
        const userOperationEventArgs = event[0].args;
        log.info(`userOperationEventArgs: ${JSON.stringify(userOperationEventArgs)}`);
        const actualGasCostInHex = event[0].args[5];
        log.info(`actualGasCostInHex: ${actualGasCostInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasCostInNumber = Number(actualGasCostInHex.toString());
        log.info(`actualGasCostInNumber: ${actualGasCostInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInHex = event[0].args[6];
        log.info(`actualGasUsedInHex: ${actualGasUsedInHex} for userOpHash: ${userOpHash} and chainId: ${chainId}`);
        const actualGasUsedInNumber = Number(actualGasUsedInHex.toString());
        log.info(`actualGasUsedInNumber: ${actualGasUsedInNumber} for userOpHash: ${userOpHash} and chainId: ${chainId}`);

        const { transactionHash } = event[0];
        let logs;
        if (!(transactionHash.toLowerCase() === receipt.transactionHash.toLowerCase())) {
          log.info(`Transaction for userOpHash: ${userOpHash} on chainId: ${chainId} was front runned`);
          const frontRunnedTransactionReceipt = await ethersProvider?.getTransactionReceipt(
            transactionHash,
          ) as ethers.providers.TransactionReceipt;
          logs = filterLogs(event[0], frontRunnedTransactionReceipt.logs);
          log.info(`logs: ${JSON.stringify(logs)} for userOpHash: ${userOpHash} on chainId: ${chainId}`);
          return {
            actualGasCost: actualGasCostInNumber,
            actualGasUsed: actualGasUsedInNumber,
            success: event[0].args[4],
            logs,
            frontRunnedTransactionReceipt,
          };
        }
        logs = filterLogs(event[0], receipt.logs);
        log.info(`logs: ${JSON.stringify(logs)} for userOpHash: ${userOpHash} on chainId: ${chainId}`);
        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success: event[0].args[4],
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

function encode(
  typevalues: Array<{ type: string; val: any }>,
  forSignature: boolean,
): string {
  const types = typevalues.map((typevalue) => (typevalue.type === 'bytes' && forSignature ? 'bytes32' : typevalue.type));
  const values = typevalues.map((typevalue: any) => (typevalue.type === 'bytes' && forSignature
    ? keccak256(typevalue.val)
    : typevalue.val));
  return defaultAbiCoder.encode(types, values);
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

    let encoded = defaultAbiCoder.encode(
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

export const getAddress = (data?: BytesLike): string | undefined => {
  if (data == null) {
    return undefined;
  }
  const str = hexlify(data);
  if (str.length >= 42) {
    return str.slice(0, 42);
  }
  return undefined;
};

// extract address from "data" (first 20 bytes)
// add it as "addr" member to the "stakeinfo" struct
// if no address, then return "undefined" instead of struct.
export const fillEntity = (data: BytesLike, info: StakeInfo): StakeInfo | undefined => {
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
): string {
  if (!op.initCode || !op.callData || !op.paymasterAndData) throw new Error('Missing userOp properties');

  if (forSignature) {
    return defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
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
  return defaultAbiCoder.encode(
    ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
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
