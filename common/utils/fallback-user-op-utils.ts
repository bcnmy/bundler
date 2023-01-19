import { ethers } from 'ethers';
import { config } from '../../config';
import { logger } from '../log-config';
import { GetMetaDataFromFallbackUserOpReturnType } from '../types';
import { axiosPostCall } from './axios-calls';

const log = logger(module);

export const getMetaDataFromFallbackUserOp = async (
  to: string,
  data: string,
  chainId: number,
  dappAPIKey: string,
): Promise<GetMetaDataFromFallbackUserOpReturnType> => {
  try {
    // extract fallbackUserOp from data
    const destinationSmartContractAddresses: Array<string> = [];
    const destinationSmartContractMethodsCallData: Array<string> = [];
    const destinationSmartContractMethods: Array<{ address: string, name: string }> = [];
    const { multiSendCallOnlyAbi, smartWalletAbi } = config.abi;
    const multiSendCallOnlyContractAddress = config.chains.multiSendCallOnlyAddress[chainId];
    log.info(`Multi Send Call Only Contract Address: ${multiSendCallOnlyContractAddress} on chainId: ${chainId}`);
    const { fallbackContractAbi } = config.fallbackGasTankData[chainId];

    const gasTankCallData = data;
    const iFaceGasTank = new ethers.utils.Interface(fallbackContractAbi);
    const decodedDataGasTank = iFaceGasTank.parseTransaction({
      data: gasTankCallData,
    });

    const methodArgsGasTank = decodedDataGasTank.args;
    const fallbackUserOp = methodArgsGasTank[0];

    const walletAddress = fallbackUserOp.sender;
    log.info(`Extracting data for wallet address: ${walletAddress} on chainId: ${chainId}`);

    /**
     * using callData from fallbackUserOp, callData is data of execFromEntryPoint https://github.com/bcnmy/scw-contracts/blob/master/contracts/smart-contract-wallet/SmartWallet.sol
     * Will get tagret and from target address fetch abi from abi
     */

    // TODO keep interface generic basis on wallet if it is biconomy smart contract wallet
    // or another wallet and take care of versioning
    // https://github.com/bcnmy/scw-contracts/blob/5c22c474c90737611cd99d280eb69464cb235d2e/contracts/smart-contract-wallet/SmartWallet.sol#L183
    // Transaction memory _tx, unit256 batchId, FeeRefund memory refundInfo, bytes memory signatures

    const { target, callData } = fallbackUserOp;
    if (target.toLowerCase() === multiSendCallOnlyContractAddress) {
      const multiSendCallOnlyCallData = callData;
      const iFaceMultiSendCallOnly = new ethers.utils.Interface(multiSendCallOnlyAbi);
      const decodedDataMultiSendCallOnly = iFaceMultiSendCallOnly.decodeFunctionData('multiSend(bytes)', multiSendCallOnlyCallData);
      if (!decodedDataMultiSendCallOnly) {
        log.info(`Could not decode data from ${data} for multi send call only with address: ${multiSendCallOnlyContractAddress}`);
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Multi send call only decoded data for wallet address: ${fallbackUserOp.sender} is: ${decodedDataMultiSendCallOnly} on chainId: ${chainId}`);
      // Two times multi send because one to represnt contract name, next for funciton name
      const methodArgsMultiSendMultiSendCallOnly = decodedDataMultiSendCallOnly[0];
      if (!methodArgsMultiSendMultiSendCallOnly) {
        log.info(`No value args found in decoded data: ${data} of multi send call only: ${to}`);
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      const transactions = methodArgsMultiSendMultiSendCallOnly.slice(2);
      log.info(`Multi send call only transactions encoded data: ${transactions} for dappId: ${multiSendCallOnlyContractAddress}`);

      const lengthOfEncodedTransactions = transactions.length;
      const lengthOfSingleEncodedTransaction = 306;
      const numOfDestinationSmartContractAddresses = lengthOfEncodedTransactions
      / lengthOfSingleEncodedTransaction;
      log.info(`Number of destination smart contract address for wallet address: ${fallbackUserOp.sender} are: ${numOfDestinationSmartContractAddresses} on chainId: ${chainId}`);
      for (
        let transactionsIndex = 0;
        transactionsIndex < numOfDestinationSmartContractAddresses;
        transactionsIndex += 1
      ) {
        // https://goerli.etherscan.io/address/0xa1677D8C8eDb188E49ECd832236Af281d6b0b20e#code
        const offset = 306;
        const destinationSmartContractAddress = transactions.slice(
          2 + offset * transactionsIndex,
          42 + offset * transactionsIndex,
        );
        destinationSmartContractAddresses.push(`0x${destinationSmartContractAddress.toLowerCase()}`);
        const destinationSmartContractMethodCallData = transactions.slice(
          170 + offset * transactionsIndex,
          306 + offset * transactionsIndex,
        );
        destinationSmartContractMethodsCallData.push(`0x${destinationSmartContractMethodCallData}`);
      }
    } else {
      const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
      const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction({ data: callData });
      if (!decodedDataSmartWallet) {
        log.info(`Could not parse call data of smart wallet for fallbackUserOp: ${JSON.stringify(fallbackUserOp)}`);
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} on chainId: ${chainId}`);

      const methodArgsSmartWalletExecTransaction = decodedDataSmartWallet.args;
      if (!methodArgsSmartWalletExecTransaction) {
        log.info('No value args found in decoded data of the smart wallet for execTransaction');
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecTransaction)} on chainId: ${chainId}`);

      const transactionInfoForExecTransaction = methodArgsSmartWalletExecTransaction[0];
      if (!transactionInfoForExecTransaction) {
        log.info('Transction info not found in arguments of parse transaction');
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Transaction info for wallet addresss: ${fallbackUserOp.sender} is ${JSON.stringify(transactionInfoForExecTransaction)} on chainId: ${chainId}`);

      const destinationSmartContractAddress = transactionInfoForExecTransaction.to;
      const destinationSmartContractMethodCallData = transactionInfoForExecTransaction.data;

      destinationSmartContractAddresses.push(destinationSmartContractAddress.toLowerCase());
      destinationSmartContractMethodsCallData.push(destinationSmartContractMethodCallData);
    }

    log.info(`Destination Smart Contract Addresses for walletAddress: ${fallbackUserOp.sender} are: ${destinationSmartContractAddresses} on chainId: ${chainId}`);
    log.info(`Destination Smart Contract Methods call data for walletAddress: ${fallbackUserOp.sender} are: ${destinationSmartContractMethodsCallData} on chainId: ${chainId}`);
    log.info(`Getting smart contract data for addresses:${JSON.stringify(destinationSmartContractAddresses)} on chainId: ${chainId}`);
    log.info(`Making call to paymaster dashboard backend to get data on ${config.paymasterDashboardBackendConfig.dappDataUrl} for dappAPIKey: ${dappAPIKey}`);

    const dataFromPaymasterDashboardBackend = await axiosPostCall(
      config.paymasterDashboardBackendConfig.dappDataUrl,
      {
        apiKey: dappAPIKey,
        smartContractAddresses: destinationSmartContractAddresses,
      },
    );
    if (dataFromPaymasterDashboardBackend.statusCode !== 200) {
      throw dataFromPaymasterDashboardBackend.message;
    }
    const {
      dapp,
      smartContracts,
    } = dataFromPaymasterDashboardBackend.data;
    const dappId = dapp._id;

    log.info(`Data fetched for dappId: ${dappId}`);
    log.info(`dapp: ${JSON.stringify(dapp)}`);
    log.info(`smartContracts: ${JSON.stringify(smartContracts)}`);
    for (
      let smartContractDataIndex = 0;
      smartContractDataIndex < smartContracts.length;
      smartContractDataIndex += 1
    ) {
      const { abi } = smartContracts[smartContractDataIndex];
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
        address: smartContracts[smartContractDataIndex].address,
      });
    }

    return {
      destinationSmartContractAddresses,
      destinationSmartContractMethods,
    };
  } catch (error: any) {
    log.info(`Error in getting wallet transaction data for to address: ${to} on chainId: ${chainId} with error: ${JSON.parse(error)} for dappAPIKey: ${dappAPIKey}`);
    return {
      destinationSmartContractAddresses: [],
      destinationSmartContractMethods: [],
    };
  }
};
