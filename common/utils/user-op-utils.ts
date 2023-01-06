import { ethers } from 'ethers';
import { config } from '../../config';
import { logger } from '../log-config';
import { GetMetaDataFromUserOpReturnType, UserOperationType } from '../types';
import { axiosGetCall } from './axios-calls';

const log = logger(module);

export const getMetaDataFromUserOp = async (
  userOp: UserOperationType,
  chainId: number,
  dappAPIKey: string,
): Promise<GetMetaDataFromUserOpReturnType> => {
  try {
    const walletAddress = userOp.sender;
    log.info(`Extracting data for wallet address: ${walletAddress} for dappAPIKey: ${dappAPIKey}`);
    const destinationSmartContractAddresses: Array<string> = [];
    const destinationSmartContractMethodsCallData: Array<string> = [];
    const destinationSmartContractMethods: Array<{ address: string, name: string }> = [];
    const { smartWalletAbi, multiSendAbi } = config.abi;
    const multiSendContractAddress = config.chains.multiSendAddress[chainId];
    log.info(`Multi Send Contract Address: ${multiSendContractAddress} for dappAPIKey: ${dappAPIKey}`);

    /**
     * using callData from userOp, callData is data of execFromEntryPoint https://github.com/bcnmy/scw-contracts/blob/master/contracts/smart-contract-wallet/SmartWallet.sol
     * Will get tagret and from target address fetch abi from abi
     */

    // TODO keep interface generic basis on wallet if it is biconomy smart contract wallet
    // or another wallet and take care of versioning
    // https://github.com/bcnmy/scw-contracts/blob/5c22c474c90737611cd99d280eb69464cb235d2e/contracts/smart-contract-wallet/SmartWallet.sol#L480
    // address dest, uint value, bytes calldata func, Enum.Operation operation, uint256 gasLimit

    const { callData } = userOp;
    const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
    const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction({ data: callData });
    log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} for dappAPIKey: ${dappAPIKey}`);

    const methodArgsSmartWalletExecFromEntryPoint = decodedDataSmartWallet.args;
    log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecFromEntryPoint)} for dappAPIKey: ${dappAPIKey}`);

    const relayerDestinationContractAddress = methodArgsSmartWalletExecFromEntryPoint[0];
    log.info(`Relayer Destination Contract Address for wallet addresss: ${userOp.sender} is ${relayerDestinationContractAddress} for dappAPIKey: ${dappAPIKey}`);

    const relayerDestinationContractMethodCallData = methodArgsSmartWalletExecFromEntryPoint[2];
    log.info(`Relayer Destination Contract Method Call Data for wallet address: ${userOp.sender} is ${relayerDestinationContractMethodCallData} for dappAPIKey: ${dappAPIKey}`);

    if (relayerDestinationContractAddress.toLowerCase()
        === multiSendContractAddress.toLowerCase()) {
      const multiSendCallData = relayerDestinationContractMethodCallData;
      const iFaceMultiSend = new ethers.utils.Interface(multiSendAbi);
      const decodedDataMultiSend = iFaceMultiSend.decodeFunctionData('multiSend(bytes)', multiSendCallData);
      log.info(`Multi send decoded data for wallet address: ${userOp.sender} is: ${decodedDataMultiSend} for dappAPIKey: ${dappAPIKey}`);
      // Two times multi send because one to represnt contract name, next for funciton name
      const methodArgsMultiSendMultiSend = decodedDataMultiSend[0];
      const transactions = methodArgsMultiSendMultiSend.slice(2);
      log.info(`Multi send transactions encoded data: ${transactions} for dappAPIKey: ${dappAPIKey}`);

      const lengthOfEncodedTransactions = transactions.length;
      const lengthOfSingleEncodedTransaction = 306;
      const numOfDestinationSmartContractAddresses = lengthOfEncodedTransactions
          / lengthOfSingleEncodedTransaction;
      log.info(`Number of destination smart contract address for wallet address: ${userOp.sender} are: ${numOfDestinationSmartContractAddresses} for dappAPIKey: ${dappAPIKey}`);
      for (
        let transactionsIndex = 0;
        transactionsIndex < numOfDestinationSmartContractAddresses;
        transactionsIndex += 1
      ) {
        // https://goerli.etherscan.io/address/0x2f65beD438a30827D408b7c6818ec5A22C022Dd1#code
        const offset = 306;
        const destinationSmartContractAddress = transactions.slice(
          2 + offset * transactionsIndex,
          42 + offset * transactionsIndex,
        );
        destinationSmartContractAddresses.push(`0x${destinationSmartContractAddress}`);
        const destinationSmartContractMethodCallData = transactions.slice(
          170 + offset * transactionsIndex,
          306 + offset * transactionsIndex,
        );
        destinationSmartContractMethodsCallData.push(`0x${destinationSmartContractMethodCallData}`);
      }
    } else {
      destinationSmartContractAddresses.push(relayerDestinationContractAddress);
      destinationSmartContractMethodsCallData.push(relayerDestinationContractMethodCallData);
    }
    log.info(`Destination Smart Contract Addresses for walletAddress: ${userOp.sender} are: ${destinationSmartContractAddresses} for dappAPIKey: ${dappAPIKey}`);
    log.info(`Destination Smart Contract Methods for walletAddress: ${userOp.sender} are: ${destinationSmartContractMethodsCallData} for dappAPIKey: ${dappAPIKey}`);
    log.info(`Getting smart contract data for addresses:${JSON.stringify(destinationSmartContractAddresses)} for dappAPIKey: ${dappAPIKey}`);
    const dataFromPaymasterDashboardBackend = await axiosGetCall(
      config.paymasterDashboardBackendUrl,
      {
        dappAPIKey,
        smartContractAddresses: destinationSmartContractAddresses,
      },
    );
    if (dataFromPaymasterDashboardBackend.statusCode !== 200) {
      throw dataFromPaymasterDashboardBackend.message;
    }
    const {
      dappData,
      smartContractData,
    } = dataFromPaymasterDashboardBackend.data;
    const dappId = dappData._id;

    log.info(`Data fetched for dappId: ${dappId}`);
    log.info(`dappData: ${JSON.stringify(dappData)}`);
    log.info(`smartContractData: ${JSON.stringify(smartContractData)}`);

    for (
      let smartContractDataIndex = 0;
      smartContractDataIndex < smartContractData.length;
      smartContractDataIndex += 1
    ) {
      const { abi } = smartContractData[smartContractDataIndex];
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
        address: smartContractData[smartContractDataIndex].address,
      });
    }

    return {
      destinationSmartContractAddresses,
      destinationSmartContractMethods,
    };
  } catch (error: any) {
    log.info(`Error in getting wallet transaction data for userOp: ${userOp} on chainId: ${chainId} with error: ${JSON.parse(error)} for dappAPIKey: ${dappAPIKey}`);
    return {
      destinationSmartContractAddresses: [],
      destinationSmartContractMethods: [],
    };
  }
};
