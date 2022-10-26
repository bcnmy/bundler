/* eslint-disable no-await-in-loop */
import axios from 'axios';
import { BigNumber, ethers } from 'ethers';
import EventEmitter from 'events';
import { EVMAccount } from '../../relayer/src/services/account';
import { EVMRawTransactionType } from '../types';
import { ERC20_ABI } from '../constants';
import { IERC20NetworkService, INetworkService, RpcMethod } from './interface';
import { Type0TransactionGasPriceType, Type2TransactionGasPriceType } from './types';
import { logger } from '../log-config';

const log = logger(module);
export class EVMNetworkService implements INetworkService<EVMAccount, EVMRawTransactionType>,
 IERC20NetworkService {
  chainId: number;

  rpcUrl: string;

  ethersProvider: ethers.providers.JsonRpcProvider;

  fallbackRpcUrls: string[];

  constructor(options: {
    chainId: number, rpcUrl: string, fallbackRpcUrls: string[]
  }) {
    this.chainId = options.chainId;
    this.rpcUrl = options.rpcUrl;
    this.fallbackRpcUrls = options.fallbackRpcUrls;
    this.ethersProvider = new ethers.providers.JsonRpcProvider(options.rpcUrl);
  }

  getActiveRpcUrl(): string {
    return this.rpcUrl;
  }

  setActiveRpcUrl(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }

  getFallbackRpcUrls(): string[] {
    return this.fallbackRpcUrls;
  }

  setFallbackRpcUrls(fallbackRpcUrls: string[]): void {
    this.fallbackRpcUrls = fallbackRpcUrls;
  }

  // REVIEW
  // change any to some defined type
  useProvider = async (tag: RpcMethod, params?: any): Promise<any> => {
    let rpcUrlIndex = 0;
    // eslint-disable-next-line consistent-return
    const withFallbackRetry = async () => {
      try {
        switch (tag) {
          case RpcMethod.getGasPrice:
            return await this.ethersProvider.getGasPrice();
          case RpcMethod.getEIP1159GasPrice:
            return await this.ethersProvider.getFeeData();
          case RpcMethod.getBalance:
            return await this.ethersProvider.getBalance(params.address);
          case RpcMethod.estimateGas:
            return await this.ethersProvider.estimateGas(params);
          case RpcMethod.getTransactionReceipt:
            return await this.ethersProvider.getTransactionReceipt(params.transactionHash);
          case RpcMethod.getTransactionCount:
            if (params.pendingNonce === true) {
              return await this.ethersProvider.getTransactionCount(params.address, 'pending');
            }
            return await this.ethersProvider.getTransactionCount(params.address);
          // TODO: Check error type
          case RpcMethod.sendTransaction:
            return await this.ethersProvider.sendTransaction(params.tx);
          case RpcMethod.waitForTransaction:
            return await this.ethersProvider.waitForTransaction(params.transactionHash);
          default:
            return null;
        }
      } catch (error) {
        // TODO // Handle errors
        log.info(`Error in network service ${error}`);
        for (;rpcUrlIndex < this.fallbackRpcUrls.length; rpcUrlIndex += 1) {
          this.ethersProvider = new ethers.providers.JsonRpcProvider(
            this.fallbackRpcUrls[rpcUrlIndex],
          );
          withFallbackRetry();
        }
      }
    };
    return withFallbackRetry();
  };

  async getEIP1559GasPrice(): Promise<Type2TransactionGasPriceType> {
    const feeData = await this.useProvider(RpcMethod.getEIP1159GasPrice);
    const maxFeePerGas = ethers.utils.hexValue(feeData.maxFeePerGas);
    const maxPriorityFeePerGas = ethers.utils.hexValue(feeData.maxPriorityFeePerGas);
    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  async getGasPrice() :Promise<Type0TransactionGasPriceType> {
    const gasPrice = (await this.useProvider(RpcMethod.getGasPrice)).toHexString();
    return {
      gasPrice,
    };
  }

  static getBumpedUpGasPrice(
    pastGasPrice: Type0TransactionGasPriceType,
    bumpingPercentage: number,
  ): Type0TransactionGasPriceType {
    let resubmitGasPrice: number;
    const bumpedUpPrice = {
      gasPrice: ethers.utils.hexValue(
        BigNumber.from(pastGasPrice.gasPrice)
          .mul(bumpingPercentage + 100)
          .div(100),
      ),
    };
    if (
      parseInt(bumpedUpPrice.gasPrice as string, 10)
         < 1.1 * parseInt(pastGasPrice.gasPrice as string, 10)
    ) {
      resubmitGasPrice = 1.1 * parseInt(pastGasPrice.gasPrice as string, 10);
    } else {
      resubmitGasPrice = parseInt(bumpedUpPrice.gasPrice as string, 10);
    }

    return {
      gasPrice: ethers.BigNumber.from(resubmitGasPrice.toString()).toHexString(),
    };
  }

  static getEIP1559BumpedUpGasPrice(
    pastGasPrice: Type2TransactionGasPriceType,
    bumpingPercentage: number,
  ): Type2TransactionGasPriceType {
    let resubmitMaxFeePerGas: number;
    let resubmitMaxPriorityFeePerGas: number;
    const { maxPriorityFeePerGas, maxFeePerGas } = pastGasPrice;
    const pastMaxPriorityFeePerGas = maxPriorityFeePerGas;
    const pastMaxFeePerGas = maxFeePerGas;

    const bumpedUpMaxPriorityFeePerGas = ethers.utils.hexValue(
      BigNumber.from(maxPriorityFeePerGas)
        .mul(bumpingPercentage + 100)
        .div(100),
    );

    const bumpedUpMaxFeePerGas = ethers.utils.hexValue(
      BigNumber.from(pastMaxFeePerGas)
        .mul(bumpingPercentage + 100)
        .div(100),
    );

    if (
      parseInt(bumpedUpMaxPriorityFeePerGas as string, 10)
       < parseInt(pastMaxPriorityFeePerGas as string, 10) * 1.11) {
      resubmitMaxPriorityFeePerGas = parseInt(pastMaxPriorityFeePerGas as string, 10) * 1.11;
    } else {
      resubmitMaxPriorityFeePerGas = parseInt(pastMaxPriorityFeePerGas as string, 10);
    }

    if (
      parseInt(bumpedUpMaxFeePerGas as string, 10)
       < parseInt(pastMaxFeePerGas as string, 10) * 1.11) {
      resubmitMaxFeePerGas = parseInt(pastMaxFeePerGas as string, 10) * 1.11;
    } else {
      resubmitMaxFeePerGas = parseInt(pastMaxFeePerGas as string, 10);
    }

    return {
      maxFeePerGas: ethers.BigNumber.from(resubmitMaxPriorityFeePerGas.toString()).toHexString(),
      maxPriorityFeePerGas: ethers.BigNumber.from(resubmitMaxFeePerGas.toString()).toHexString(),
    };
  }

  async getBalance(address: string): Promise<BigNumber> {
    const balance = await this.useProvider(RpcMethod.getBalance, {
      address,
    });
    return balance;
  }

  getContract(_abi: string, contractAddress: string) : ethers.Contract {
    const abi = new ethers.utils.Interface(_abi);
    const contract = new ethers.Contract(
      contractAddress,
      abi,
      this.ethersProvider,
    );
    return contract;
  }

  async getTokenBalance(userAddress: string, tokenAddress: string): Promise<BigNumber> {
    const erc20Contract = this.getContract(JSON.stringify(ERC20_ABI), tokenAddress);
    const tokenBalance = await erc20Contract.balanceOf(userAddress);
    return tokenBalance;
  }

  async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    value: BigNumber,
  ): Promise<boolean> {
    const erc20Contract = this.getContract(JSON.stringify(ERC20_ABI), tokenAddress);
    let isSpenderAllowed = false;
    const tokensLeftToSpend = await erc20Contract.allowance(ownerAddress, spenderAddress);
    if (tokensLeftToSpend.sub(value) > 0) {
      isSpenderAllowed = true;
    }
    return isSpenderAllowed;
  }

  async executeReadMethod(
    abi: string,
    address: string,
    methodName: string,
    params: any,
  ):Promise<object> {
    const contract = this.getContract(abi, address);
    const contractReadMethodValue = await contract[methodName].apply(null, params);
    return contractReadMethodValue;
  }

  async estimateGas(
    contract: ethers.Contract,
    methodName: string,
    params: any,
    from: string,
  ): Promise<BigNumber> {
    const contractInterface = contract.interface;
    const functionSignature = contractInterface.encodeFunctionData(
      methodName,
      params,
    );
    const estimatedGas = await this.useProvider(RpcMethod.estimateGas, {
      from,
      to: contract.address,
      data: functionSignature,
    });
    return estimatedGas;
  }

  async getTransactionReceipt(
    transactionHash: string,
  ): Promise<ethers.providers.TransactionReceipt> {
    const transactionReceipt = await this.useProvider(
      RpcMethod.getTransactionReceipt,
      transactionHash,
    );
    return transactionReceipt;
  }

  async getNonce(address: string, pendingNonce = true): Promise<number> {
    const nonce = await this.useProvider(RpcMethod.getTransactionCount, {
      pendingNonce,
      address,
    });
    return nonce;
  }

  async sendTransaction(
    rawTransactionData: EVMRawTransactionType,
    account: EVMAccount,
  ): Promise<ethers.providers.TransactionResponse> {
    const rawTx: EVMRawTransactionType = rawTransactionData;
    rawTx.from = account.getPublicKey();
    const tx = await account.signTransaction(rawTx);
    const receipt = await this.useProvider(RpcMethod.sendTransaction, {
      tx,
    });
    return receipt;
  }

  async waitForTransaction(transactionHash: string): Promise<ethers.providers.TransactionReceipt> {
    const transactionReceipt = await this.useProvider(RpcMethod.waitForTransaction, {
      transactionHash,
    });
    return transactionReceipt;
  }

  async getContractEventEmitter(
    contractAddress: string,
    contractAbi: string,
    topic: string,
    contractEventName: string,
  ): Promise<EventEmitter> {
    const filter = EVMNetworkService.createFilter(contractAddress, topic);
    const iFace = new ethers.utils.Interface(contractAbi);
    const contractTopicEventEmitter = new EventEmitter();

    this.ethersProvider.on(filter, async (contractLog) => {
      const parsedLog = iFace.parseLog(contractLog);
      contractTopicEventEmitter.emit(contractEventName, parsedLog);
    });
    return contractTopicEventEmitter;
  }

  async getDecimal(tokenAddress: string): Promise<number> {
    const erc20Contract = this.getContract(JSON.stringify(ERC20_ABI), tokenAddress);
    const decimal = await erc20Contract.decimal;
    return decimal;
  }

  async sendRpcCall(method: string, params: Array<object>): Promise<any> {
    const data = {
      method,
      params,
      jsonrpc: '2.0',
      id: 1,
    };
    const response = await axios.post(this.rpcUrl, data);
    return response;
  }

  static createFilter(contractAddress: string, topic: string) {
    return {
      address: contractAddress,
      topics: [
        topic,
      ],
    };
  }
}
