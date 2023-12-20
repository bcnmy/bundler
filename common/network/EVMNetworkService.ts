/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable new-cap */
import axios from 'axios';
import {
  PublicClient, Transaction, TransactionReceipt, createPublicClient, http,
} from 'viem';
import { IEVMAccount } from '../../relayer/src/services/account';
import {
  AlchemyMethodType,
  EVMRawTransactionType, EthMethodType, RpcMethod,
} from '../types';
import { INetworkService } from './interface';
import { Type0TransactionGasPriceType, Type2TransactionGasPriceType } from './types';
import { logger } from '../logger';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export class EVMNetworkService implements INetworkService<IEVMAccount, EVMRawTransactionType> {
  chainId: number;

  rpcUrl: string;

  provider: PublicClient;

  constructor(options: { chainId: number; rpcUrl: string }) {
    this.chainId = options.chainId;
    this.rpcUrl = options.rpcUrl;
    this.provider = createPublicClient({
      transport: http(this.rpcUrl),
    });
  }

  /**
   * method to handle various rpc methods
   * and fallback to other rpc urls if the current rpc url fails
   * @param tag RpcMethod enum
   * @param params parameters required for the rpc method
   * @returns based on the rpc method
   */
  useProvider = async (tag: RpcMethod, params?: any): Promise<any> => {
    switch (tag) {
      case RpcMethod.getTransactionReceipt:
        return await this.provider.getTransactionReceipt(params);
      case RpcMethod.waitForTransaction:
        return await this.provider.waitForTransactionReceipt({
          hash: params.transactionHash,
          confirmations: params.confirmations,
          timeout: params.timeout,
        });
      case RpcMethod.getTransaction:
        return await this.provider.getTransaction(params.transactionHash);
      case RpcMethod.getLatestBlockNumber:
        return await this.provider.getBlockNumber();
      default:
        return null;
    }
  };

  async sendRpcCall(method: string, params: Array<any>): Promise<any> {
    const requestData = {
      method,
      params,
      jsonrpc: '2.0',
      id: Date.now(),
    };
    const response = await axios.post(this.rpcUrl, requestData);
    const {
      data,
    } = response;
    if (!data) {
      log.error(`RPC Call failed without data on chainId: ${this.chainId}`);
      return null;
    }
    return data.result;
  }

  async getBaseFeePerGas(): Promise<number> {
    const feeData = await this.useProvider(RpcMethod.getFeeHistory);
    return Number(feeData.lastBaseFeePerGas);
  }

  async getLegacyGasPrice(): Promise<Type0TransactionGasPriceType> {
    return await this.sendRpcCall(EthMethodType.GAS_PRICE, []);
  }

  async getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType> {
    const maxFeePerGasPromise = this.getLegacyGasPrice();
    const maxPriorityFeePerGasPromise = this.sendRpcCall(
      EthMethodType.MAX_PRIORITY_FEE_PER_GAS,
      [],
    );
    const [maxFeePerGas, maxPriorityFeePerGas] = await Promise.all(
      [maxFeePerGasPromise, maxPriorityFeePerGasPromise],
    );

    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  async getBalance(address: string): Promise<BigInt> {
    const balance = await this.sendRpcCall(EthMethodType.GET_BALANCE, [address]);
    return BigInt(balance);
  }

  /**
   * Estimate gas for a transaction
   * @param contract contract instance
   * @param methodName name of the method to be executed
   * @param params parameters required for the method to be encoded
   * @param from address of the user
   * @returns estimate gas for the transaction in big number
   */

  async estimateGas(
    params: any, // TODO type define params
  ): Promise<any> {
    return await this.sendRpcCall(EthMethodType.ESTIMATE_GAS, params);
  }

  async ethCall(params: any): Promise<any> {
    return await this.sendRpcCall(EthMethodType.ETH_CALL, params);
  }

  async getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt> {
    return await this.useProvider(
      RpcMethod.getTransactionReceipt,
      transactionHash,
    );
  }

  /**
   * Get the nonce of the user
   * @param address address
   * @param pendingNonce include the nonce of the pending transaction
   * @returns by default returns the next nonce of the address
   * if pendingNonce is set to false, returns the nonce of the mined transaction
   */
  async getNonce(address: string, pendingNonce = true): Promise<number> {
    const params = pendingNonce ? [address, 'pending'] : [address];
    return await this.sendRpcCall(
      EthMethodType.GET_TRANSACTION_COUNT,
      params,
    );
  }

  async sendTransaction(
    rawTransactionData: EVMRawTransactionType,
    account: IEVMAccount,
  ): Promise<Transaction> {
    const rawTx: EVMRawTransactionType = rawTransactionData;
    rawTx.from = account.getPublicKey();
    const tx = await account.signTransaction(rawTx);
    return await this.sendRpcCall(EthMethodType.SEND_RAW_TRANSACTION, [tx]);
  }

  /**
   * @param transactionHash transaction hash
   * @returns receipt of the transaction once mined, else waits for the transaction to be mined
   */
  async waitForTransaction(
    transactionHash: string,
    confirmations?: number,
    timeout?: number,
  ): Promise<TransactionReceipt> {
    return await this.useProvider(RpcMethod.waitForTransaction, {
      transactionHash,
      confirmations,
      timeout,
    });
  }

  /**
   * @param transactionHash transaction hash
   * @returns transaction once mined, else waits for the transaction to be mined
  */
  async getTransaction(transactionHash: string): Promise<Transaction> {
    return await this.useProvider(RpcMethod.getTransaction, {
      transactionHash,
    });
  }

  async getLatesBlockNumber(): Promise<bigint> {
    return await this.useProvider(RpcMethod.getLatestBlockNumber);
  }

  async runAlchemySimulation(params: any): Promise<any> {
    return await this.sendRpcCall(AlchemyMethodType.SIMULATE_EXECUTION, params);
  }
}
