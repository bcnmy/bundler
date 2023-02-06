import { ethers } from 'ethers';
import { config } from '../../config';
import { STATUSES } from '../../server/src/middleware';
import { LengthOfSingleEncodedTransaction } from '../constants';
import { logger } from '../log-config';
import { GetMetaDataFromUserOpReturnType, UserOperationType } from '../types';
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

    const relayerDestinationContractAddress = methodArgsSmartWalletExecFromEntryPoint[0];
    log.info(`Relayer Destination Contract Address for wallet addresss: ${userOp.sender} is ${relayerDestinationContractAddress} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    const relayerDestinationContractMethodCallData = methodArgsSmartWalletExecFromEntryPoint[2];
    log.info(`Relayer Destination Contract Method Call Data for wallet address: ${userOp.sender} is ${relayerDestinationContractMethodCallData} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

    if (relayerDestinationContractAddress.toLowerCase()
        === multiSendContractAddress.toLowerCase()) {
      const multiSendCallData = relayerDestinationContractMethodCallData;
      const iFaceMultiSend = new ethers.utils.Interface(multiSendAbi);
      const decodedDataMultiSend = iFaceMultiSend.decodeFunctionData('multiSend(bytes)', multiSendCallData);
      log.info(`Multi send decoded data for wallet address: ${userOp.sender} is: ${decodedDataMultiSend} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      // Two times multi send because one to represnt contract name, next for funciton name
      const methodArgsMultiSendMultiSend = decodedDataMultiSend[0];
      const transactions = methodArgsMultiSendMultiSend.slice(2);
      log.info(`Multi send transactions encoded data: ${transactions} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

      const lengthOfEncodedTransactions = transactions.length;
      const lengthOfSingleEncodedTransaction = LengthOfSingleEncodedTransaction;
      const numOfDestinationSmartContractAddresses = lengthOfEncodedTransactions
          / lengthOfSingleEncodedTransaction;
      log.info(`Number of destination smart contract address for wallet address: ${userOp.sender} are: ${numOfDestinationSmartContractAddresses} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);
      for (
        let transactionsIndex = 0;
        transactionsIndex < numOfDestinationSmartContractAddresses;
        transactionsIndex += 1
      ) {
        // https://goerli.etherscan.io/address/0x2f65beD438a30827D408b7c6818ec5A22C022Dd1#code
        const offset = 370;
        const destinationSmartContractAddress = transactions.slice(
          2 + offset * transactionsIndex,
          42 + offset * transactionsIndex,
        );
        destinationSmartContractAddresses.push(`0x${destinationSmartContractAddress.toLowerCase()}`);
        const destinationSmartContractMethodCallData = transactions.slice(
          170 + offset * transactionsIndex,
          370 + offset * transactionsIndex,
        );
        destinationSmartContractMethodsCallData.push(`0x${destinationSmartContractMethodCallData}`);
      }
    } else {
      destinationSmartContractAddresses.push(relayerDestinationContractAddress.toLowerCase());
      destinationSmartContractMethodsCallData.push(relayerDestinationContractMethodCallData);
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
    log.info(`Relayer Destination Smart Contract Address: ${JSON.stringify(relayerDestinationContractAddress)} for dappAPIKey: ${dappAPIKey} for userOp: ${JSON.stringify(userOp)}`);

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
