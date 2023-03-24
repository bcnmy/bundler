import { ethers } from 'ethers';
import { config } from '../../config';
import { STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import {
  GetMetaDataFromUserOpReturnType, Log, UserOperationEventEvent, UserOperationType,
} from '../types';
import { axiosPostCall } from './axios-calls';
import { parseError } from './parse-error';

const log = logger(module);

// TODO Add null checks while extracting from call data
export const getMetaDataFromUserOp = async (
  userOp: UserOperationType,
  chainId: number,
  dappAPIKey: string,
): Promise<GetMetaDataFromUserOpReturnType> => {
  try {
    const walletAddress = userOp.sender;
    log.info(`Extracting data for wallet address: ${walletAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
    const destinationSmartContractAddresses: Array<string> = [];
    const destinationSmartContractMethodsCallData: Array<string> = [];
    const destinationSmartContractMethods: Array<{ address: string, name: string }> = [];
    const { smartWalletAbi, multiSendAbi } = config.abi;
    const multiSendContractAddress = config.chains.multiSendAddress[chainId];
    log.info(`Multi Send Contract Address: ${multiSendContractAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    /**
     * using callData from userOp, callData is data of execFromEntryPoint https://github.com/bcnmy/scw-contracts/blob/master/contracts/smart-contract-wallet/SmartWallet.sol
     * Will get tagret and from target address fetch abi from abi
     * target can be multiSend or destination contract
     */

    // TODO keep interface generic basis on wallet if it is biconomy smart contract wallet
    // or another wallet and take care of versioning
    // https://github.com/bcnmy/scw-contracts/blob/5c22c474c90737611cd99d280eb69464cb235d2e/contracts/smart-contract-wallet/SmartWallet.sol#L480
    // address dest, uint value, bytes calldata func, Enum.Operation operation, uint256 gasLimit

    const { callData } = userOp;
    const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
    const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction({ data: callData });
    log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const methodArgsSmartWalletExecFromEntryPoint = decodedDataSmartWallet.args;
    log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecFromEntryPoint)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const walletDestinationContractAddress = methodArgsSmartWalletExecFromEntryPoint[0];
    log.info(`Wallet Destination Contract Address for wallet addresss: ${userOp.sender} is ${walletDestinationContractAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const walletDestinationContractMethodCallData = methodArgsSmartWalletExecFromEntryPoint[2];
    log.info(`Relayer Destination Contract Method Call Data for wallet address: ${userOp.sender} is ${walletDestinationContractMethodCallData} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    if (walletDestinationContractAddress.toLowerCase()
        === multiSendContractAddress.toLowerCase()) {
      const multiSendCallData = walletDestinationContractMethodCallData;
      const iFaceMultiSend = new ethers.utils.Interface(multiSendAbi);
      const decodedDataMultiSend = iFaceMultiSend.decodeFunctionData('multiSend(bytes)', multiSendCallData);
      log.info(`Multi send decoded data for wallet address: ${userOp.sender} is: ${decodedDataMultiSend} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      // Two times multi send because one to represnt contract name, next for funciton name
      const methodArgsMultiSendMultiSend = decodedDataMultiSend[0];
      const multiSendTransactions = methodArgsMultiSendMultiSend.slice(2);

      let multiSendTransactionIndex = 0;
      while (multiSendTransactionIndex < multiSendTransactions.length) {
        // eslint-disable-next-line max-len
        const multiSendOperation = multiSendTransactions.substring(multiSendTransactionIndex + 0, multiSendTransactionIndex + 2);
        log.info(`multiSendOperation: ${multiSendOperation} for dappAPIKey: ${dappAPIKey}`);

        const multiSendTo = `0x${multiSendTransactions.substring(multiSendTransactionIndex + 2, multiSendTransactionIndex + 42)}`;
        log.info(`multiSendTo: ${multiSendTo} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendValue = multiSendTransactions.substring(multiSendTransactionIndex + 42, multiSendTransactionIndex + 106);
        log.info(`multiSendValue: ${multiSendValue} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendDataLength = multiSendTransactions.substring(multiSendTransactionIndex + 106, multiSendTransactionIndex + 170);
        log.info(`multiSendDataLength: ${multiSendDataLength} for dappAPIKey: ${dappAPIKey}`);

        const multiSendDataLengthInNum = Number(`0x${multiSendTransactions.substring(multiSendTransactionIndex + 106, multiSendTransactionIndex + 170)}`);
        log.info(`multiSendDataLengthInNum: ${multiSendDataLengthInNum} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendData = `0x${multiSendTransactions.substring(multiSendTransactionIndex + 170, multiSendTransactionIndex + 170 + (multiSendDataLengthInNum * 2))}`;
        log.info(`multiSendData: ${multiSendData} for dappAPIKey: ${dappAPIKey}`);

        destinationSmartContractAddresses.push(multiSendTo.toLowerCase());
        destinationSmartContractMethodsCallData.push(
          multiSendData.toLowerCase(),
        );
        multiSendTransactionIndex += (170 + multiSendDataLengthInNum * 2);
        log.info(`multiSendTransactionIndex: ${multiSendTransactionIndex} for dappAPIKey: ${dappAPIKey}`);
      }
    } else {
      destinationSmartContractAddresses.push(walletDestinationContractAddress.toLowerCase());
      destinationSmartContractMethodsCallData.push(walletDestinationContractMethodCallData);
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
    log.info(`Wallet Destination Smart Contract Address: ${JSON.stringify(walletDestinationContractAddress)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    return {
      destinationSmartContractAddresses,
      destinationSmartContractMethods,
    };
  } catch (error: any) {
    log.info(`Error in getting wallet transaction data for userOp: ${userOp} on chainId: ${chainId} with error: ${parseError(error)} for dappAPIKey: ${dappAPIKey}`);
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
  let startIndex = -1;
  let endIndex = -1;
  logs.forEach((eventLog, index) => {
    if (eventLog?.topics[0] === userOpEvent.topics[0]) {
      // process UserOperationEvent
      if (eventLog.topics[1] === userOpEvent.topics[1]) {
        // it's our userOpHash. save as end of logs array
        endIndex = index;
      } else {
        // it's a different hash. remember it as beginning index,
        // but only if we didn't find our end index yet.
        // eslint-disable-next-line no-lonely-if
        if (endIndex === -1) {
          startIndex = index;
        }
      }
    }
  });
  if (endIndex === -1) {
    throw new Error('fatal: no UserOperationEvent in logs');
  }
  return logs.slice(startIndex + 1, endIndex);
};

export const getUserOperationReceiptForDataSaving = async (
  chainId: number,
  userOpHash: string,
  receipt: any,
  entryPointContract: ethers.Contract,
): Promise<any> => {
  try {
    let event = [];

    try {
      event = await entryPointContract.queryFilter(
        entryPointContract.filters.UserOperationEvent(userOpHash),
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

        const logs = filterLogs(event[0], receipt.logs);
        log.info(`logs: ${JSON.stringify(logs)} for userOpHash: ${userOpHash} on chainId: ${chainId}`);

        return {
          actualGasCost: actualGasCostInNumber,
          actualGasUsed: actualGasUsedInNumber,
          success: event[0].args[4],
          logs,
        };
      }
      log.info('No event found');
      return null;
    } catch (error) {
      log.info(`Missing/invalid userOpHash for userOpHash: ${userOpHash} on chainId: ${chainId} with erro: ${parseError(error)}`);
      return null;
    }
  } catch (error) {
    log.info(`error in getUserOperationReceipt: ${parseError(error)}`);
    return null;
  }
};
