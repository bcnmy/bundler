/* eslint-disable no-continue */
import { ethers } from 'ethers';
import { config } from '../../config';
import { STATUSES } from '../../server/src/middleware';
import { logger } from '../log-config';
import { GetMetaDataFromFallbackUserOpReturnType } from '../types';
import { axiosPostCall } from './axios-calls';
import { parseError } from './parse-error';

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
    const { multiSendCallOnlyAbi, multiSendAbi, smartWalletAbi } = config.abi;
    const multiSendCallOnlyContractAddress = config.chains.multiSendCallOnlyAddress[chainId];
    const multiSendContractAddress = config.chains.multiSendAddress[chainId];
    const walletFactoryAddress = config.chains.walletFactoryAddress[chainId];
    log.info(`Multi Send Call Only Contract Address: ${multiSendCallOnlyContractAddress} on chainId: ${chainId}`);
    log.info(`Multi Send Contract Address: ${multiSendContractAddress} on chainId: ${chainId}`);
    log.info(`Wallet Factory Address: ${walletFactoryAddress} on chainId: ${chainId}`);

    /**
     * 2 cases bases on target
     * If target === multiSendCallOnly -> wallet deployment + n (1 or more) transactions
     * callData of multiSendCallOnly's multiSend will be appended call data of
     * deployCounerFactualWallet of WalletFactory and call data of execTransaction.
     * If n === 1, then execTransaction will have callData of single destination contract
     * else, execTransaction will have callData of MultiSend's multiSend,
     * which again will have appended call data of each destination contract
     *
     * Else target === walletAddress
     * Can be n (1 or more ) transactions
     * If n === 1, execTranasction will have call data of destination smart contract method
     * Else execTransaction will have call data on multiSend which will have data of
     * destination contracts
     */

    const { abi } = config.fallbackGasTankData[chainId];

    const gasTankCallData = data;
    const iFaceGasTank = new ethers.utils.Interface(abi);
    const decodedDataGasTank = iFaceGasTank.parseTransaction({
      data: gasTankCallData,
    });

    const methodArgsGasTank = decodedDataGasTank.args;
    const fallbackUserOp = methodArgsGasTank[0];

    const walletAddress = fallbackUserOp.sender;
    log.info(`Extracting data for wallet address: ${walletAddress} on chainId: ${chainId}`);

    const { target, callData } = fallbackUserOp;
    if (target.toLowerCase() === multiSendCallOnlyContractAddress) {
      log.info(`Target contract for wallet address: ${fallbackUserOp.sender} is MultiSendCallOnly: ${multiSendCallOnlyContractAddress}`);
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
      const multiSendCallOnlyTransactions = methodArgsMultiSendMultiSendCallOnly.slice(2);
      log.info(`Multi send call only transactions encoded data: ${multiSendCallOnlyTransactions} for dappAPIKey: ${multiSendCallOnlyContractAddress}`);

      let multiSendCallOnlyTransactionIndex = 0;
      while (multiSendCallOnlyTransactionIndex < multiSendCallOnlyTransactions.length) {
        // eslint-disable-next-line max-len
        const multiSendCallOnlyOperation = multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 0, multiSendCallOnlyTransactionIndex + 2);
        log.info(`multiSendCallOnlyOperation: ${multiSendCallOnlyOperation} for dappAPIKey: ${dappAPIKey}`);

        const multiSendCallOnlyTo = `0x${multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 2, multiSendCallOnlyTransactionIndex + 42)}`;
        log.info(`multiSendCallOnlyTo: ${multiSendCallOnlyTo} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendCallOnlyValue = multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 42, multiSendCallOnlyTransactionIndex + 106);
        log.info(`multiSendCallOnlyValue: ${multiSendCallOnlyValue} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendCallOnlyDataLength = multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 106, multiSendCallOnlyTransactionIndex + 170);
        log.info(`multiSendCallOnlyDataLength: ${multiSendCallOnlyDataLength} for dappAPIKey: ${dappAPIKey}`);

        const multiSendCallOnlyDataLengthInNum = Number(`0x${multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 106, multiSendCallOnlyTransactionIndex + 170)}`);
        log.info(`multiSendCallOnlyDataLengthInNum: ${multiSendCallOnlyDataLengthInNum} for dappAPIKey: ${dappAPIKey}`);

        // eslint-disable-next-line max-len
        const multiSendCallOnlyData = `0x${multiSendCallOnlyTransactions.substring(multiSendCallOnlyTransactionIndex + 170, multiSendCallOnlyTransactionIndex + 170 + (multiSendCallOnlyDataLengthInNum * 2))}`;
        log.info(`multiSendCallOnlyData: ${multiSendCallOnlyData} for dappAPIKey: ${dappAPIKey}`);

        if (multiSendCallOnlyTo.toLowerCase() === walletFactoryAddress.toLowerCase()) {
          log.info(`Multi Send Call Only's destination smart contract: ${multiSendCallOnlyTo} is Wallet Factory: ${walletFactoryAddress}, hence skipping for whitelisting`);
          multiSendCallOnlyTransactionIndex += (170 + multiSendCallOnlyDataLengthInNum * 2);
          log.info(`multiSendCallOnlyTransactionIndex: ${multiSendCallOnlyTransactionIndex} for dappAPIKey: ${dappAPIKey}`);
          continue;
        } else {
          log.info(`Multi Send Call Only's destination smart contract: ${multiSendCallOnlyTo} is wallet`);

          const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
          const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction(
            { data: multiSendCallOnlyData },
          );
          if (!decodedDataSmartWallet) {
            log.info('Could not parse call data of smart wallet for fallbackUserOp');
            return {
              destinationSmartContractAddresses: [],
              destinationSmartContractMethods: [],
            };
          }
          log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} for dappAPIKey: ${dappAPIKey}`);

          const methodArgsSmartWalletExecTransaction = decodedDataSmartWallet.args;
          if (!methodArgsSmartWalletExecTransaction) {
            log.info('No value args found in decoded data of the smart wallet for execTransaction');
            return {
              destinationSmartContractAddresses: [],
              destinationSmartContractMethods: [],
            };
          }
          log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecTransaction)} for dappAPIKey: ${dappAPIKey}`);

          const transactionInfoForExecTransaction = methodArgsSmartWalletExecTransaction[0];
          if (!transactionInfoForExecTransaction) {
            log.info('Transaction info not found in arguments of parse transaction');
            return {
              destinationSmartContractAddresses: [],
              destinationSmartContractMethods: [],
            };
          }
          log.info(`Transaction info for wallet addresss: ${fallbackUserOp.sender} is ${JSON.stringify(transactionInfoForExecTransaction)} for dappAPIKey: ${dappAPIKey}`);

          const destinationSmartContractAddress = transactionInfoForExecTransaction.to;
          const destinationSmartContractMethodCallData = transactionInfoForExecTransaction.data;

          if (destinationSmartContractAddress.toLowerCase() === multiSendContractAddress) {
            log.info(`Multi send: ${multiSendContractAddress} is called from wallet contract: ${target}`);
            const multiSendCallData = destinationSmartContractMethodCallData;
            const iFaceMultiSend = new ethers.utils.Interface(multiSendAbi);
            const decodedDataMultiSend = iFaceMultiSend.decodeFunctionData('multiSend(bytes)', multiSendCallData);
            if (!decodedDataMultiSend) {
              log.info('Could not parse call data of multi send');
              return {
                destinationSmartContractAddresses: [],
                destinationSmartContractMethods: [],
              };
            }
            log.info(`Multi send decoded data for wallet address: ${target} is: ${decodedDataMultiSend} for dappAPIKey: ${dappAPIKey}`);
            // Two times multi send because one to represnt contract name, next for funciton name
            const methodArgsMultiSendMultiSend = decodedDataMultiSend[0];
            if (!methodArgsMultiSendMultiSend) {
              log.info('No value args found in decoded data of the multi send');
              return {
                destinationSmartContractAddresses: [],
                destinationSmartContractMethods: [],
              };
            }
            const multiSendTransactions = methodArgsMultiSendMultiSend.slice(2);
            log.info(`Multi send transactions encoded data: ${multiSendTransactions} for dappAPIKey: ${dappAPIKey}`);

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
            destinationSmartContractAddresses.push(destinationSmartContractAddress.toLowerCase());
            destinationSmartContractMethodsCallData.push(
              destinationSmartContractMethodCallData.toLowerCase(),
            );
          }
        }

        multiSendCallOnlyTransactionIndex += (170 + multiSendCallOnlyDataLengthInNum * 2);
        log.info(`multiSendCallOnlyTransactionIndex: ${multiSendCallOnlyTransactionIndex} for dappAPIKey: ${dappAPIKey}`);
      }
    } else {
      log.info(`Target contract for wallet address: ${fallbackUserOp.sender} is wallet: ${target}`);
      const iFaceSmartWallet = new ethers.utils.Interface(JSON.stringify(smartWalletAbi));
      const decodedDataSmartWallet = iFaceSmartWallet.parseTransaction({ data: callData });
      if (!decodedDataSmartWallet) {
        log.info('Could not parse call data of smart wallet for fallbackUserOp');
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Decoded smart wallet data: ${JSON.stringify(decodedDataSmartWallet)} for dappAPIKey: ${dappAPIKey}`);

      const methodArgsSmartWalletExecTransaction = decodedDataSmartWallet.args;
      if (!methodArgsSmartWalletExecTransaction) {
        log.info('No value args found in decoded data of the smart wallet for execTransaction');
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Arguments of smart wallet method: ${JSON.stringify(methodArgsSmartWalletExecTransaction)} for dappAPIKey: ${dappAPIKey}`);

      const transactionInfoForExecTransaction = methodArgsSmartWalletExecTransaction[0];
      if (!transactionInfoForExecTransaction) {
        log.info('Transaction info not found in arguments of parse transaction');
        return {
          destinationSmartContractAddresses: [],
          destinationSmartContractMethods: [],
        };
      }
      log.info(`Transaction info for wallet addresss: ${fallbackUserOp.sender} is ${JSON.stringify(transactionInfoForExecTransaction)} for dappAPIKey: ${dappAPIKey}`);

      const destinationSmartContractAddress = transactionInfoForExecTransaction.to;
      const destinationSmartContractMethodCallData = transactionInfoForExecTransaction.data;

      if (destinationSmartContractAddress.toLowerCase() === multiSendContractAddress) {
        log.info(`Multi send: ${multiSendContractAddress} is called from wallet contract: ${target}`);
        const multiSendCallData = destinationSmartContractMethodCallData;
        const iFaceMultiSend = new ethers.utils.Interface(multiSendAbi);
        const decodedDataMultiSend = iFaceMultiSend.decodeFunctionData('multiSend(bytes)', multiSendCallData);
        if (!decodedDataMultiSend) {
          log.info('Could not parse call data of multi send');
          return {
            destinationSmartContractAddresses: [],
            destinationSmartContractMethods: [],
          };
        }
        log.info(`Multi send decoded data for wallet address: ${target} is: ${decodedDataMultiSend} for dappAPIKey: ${dappAPIKey}`);
        // Two times multi send because one to represnt contract name, next for funciton name
        const methodArgsMultiSendMultiSend = decodedDataMultiSend[0];
        if (!methodArgsMultiSendMultiSend) {
          log.info('No value args found in decoded data of the multi send');
          return {
            destinationSmartContractAddresses: [],
            destinationSmartContractMethods: [],
          };
        }
        const multiSendTransactions = methodArgsMultiSendMultiSend.slice(2);
        log.info(`Multi send transactions encoded data: ${multiSendTransactions} for dappAPIKey: ${dappAPIKey}`);

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
            multiSendData,
          );
          multiSendTransactionIndex += (170 + multiSendDataLengthInNum * 2);
          log.info(`multiSendTransactionIndex: ${multiSendTransactionIndex} for dappAPIKey: ${dappAPIKey}`);
        }
      } else {
        destinationSmartContractAddresses.push(destinationSmartContractAddress.toLowerCase());
        destinationSmartContractMethodsCallData.push(
          destinationSmartContractMethodCallData.toLowerCase(),
        );
      }
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
    if (dataFromPaymasterDashboardBackend.statusCode !== STATUSES.SUCCESS) {
      throw dataFromPaymasterDashboardBackend.message;
    }
    const {
      dapp,
      smartContracts,
    } = dataFromPaymasterDashboardBackend.data;
    // const dappId = dapp._id;

    log.info(`Data fetched for dappAPIKey: ${dappAPIKey}`);
    log.info(`dapp: ${JSON.stringify(dapp)}`);
    log.info(`smartContracts: ${JSON.stringify(smartContracts)}`);
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

    for (
      let smartContractDataIndex = 0;
      smartContractDataIndex < destinationSmartContractAddresses.length;
      smartContractDataIndex += 1
    ) {
      // eslint-disable-next-line @typescript-eslint/no-shadow
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

    return {
      destinationSmartContractAddresses,
      destinationSmartContractMethods,
    };
  } catch (error: any) {
    log.info(`Error in getting wallet transaction data for to address: ${to} on chainId: ${chainId} with error: ${parseError(error)} for dappAPIKey: ${dappAPIKey}`);
    return {
      destinationSmartContractAddresses: [],
      destinationSmartContractMethods: [],
    };
  }
};
