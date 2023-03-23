/* eslint-disable prefer-destructuring */
import { ethers } from 'ethers';
import { config } from '../../config';
import { STATUSES } from '../../server/src/middleware';
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
    let destinationSmartContractAddresses: Array<string> = [];
    let destinationSmartContractMethodsCallData: Array<string> = [];
    const destinationSmartContractMethods: Array<{ address: string, name: string }> = [];
    const { smartWalletAbi } = config.abi;
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
      destinationSmartContractAddresses.push(methodArgsSmartWalletExecuteCall[0]);
      destinationSmartContractMethodsCallData.push(methodArgsSmartWalletExecuteCall[2]);
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
      destinationSmartContractAddresses = methodArgsSmartWalletExecuteBatchCall[0];
      destinationSmartContractMethodsCallData = methodArgsSmartWalletExecuteBatchCall[3];
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
    log.info(`Error in getting wallet transaction data for userOp: ${userOp} on chainId: ${chainId} with error: ${parseError(error)} for dappAPIKey: ${dappAPIKey}`);
    return {
      destinationSmartContractAddresses: [],
      destinationSmartContractMethods: [],
    };
  }
};
