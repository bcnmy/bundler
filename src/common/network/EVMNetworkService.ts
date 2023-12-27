/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable new-cap */
import axios from "axios";
import {
  PublicClient,
  Transaction,
  TransactionReceipt,
  createPublicClient,
  http,
} from "viem";
import { IEVMAccount } from "../../relayer/account";
import {
  AlchemyMethodType,
  EVMRawTransactionType,
  EthMethodType,
} from "../types";
import { INetworkService } from "./interface";
import {
  Type0TransactionGasPriceType,
  Type2TransactionGasPriceType,
} from "./types";
import { logger } from "../logger";
import { customJSONStringify } from "../utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMNetworkService
  implements INetworkService<IEVMAccount, EVMRawTransactionType>
{
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

  async sendRpcCall(method: string, params: Array<any>): Promise<any> {
    const requestData = {
      method,
      params,
      jsonrpc: "2.0",
      id: Date.now(),
    };
    const response = await axios.post(this.rpcUrl, requestData);
    const { data } = response;
    log.info(
      `data from RPC call: ${customJSONStringify(
        data,
      )} received on JSON RPC Method: ${method}`,
    );
    if (!data) {
      log.error(`RPC Call failed without data on chainId: ${this.chainId}`);
      return null;
    }
    if (data.error) {
      log.error(
        `RPC called returned error on chainId: ${this.chainId} with code: ${data.error.code} and message: ${data.error.message}`,
      );
      if (
        method === EthMethodType.ETH_CALL ||
        method === EthMethodType.ESTIMATE_GAS
      ) {
        return data;
      }
      throw new Error(data.error.message);
    }
    return data.result;
  }

  async getBaseFeePerGas(): Promise<bigint> {
    const block = await this.provider.getBlock({
      blockTag: "latest",
    });
    if (typeof block.baseFeePerGas !== "bigint") {
      return BigInt(0);
    }
    return block.baseFeePerGas;
  }

  async getLegacyGasPrice(): Promise<Type0TransactionGasPriceType> {
    return BigInt(await this.sendRpcCall(EthMethodType.GAS_PRICE, []));
  }

  async getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType> {
    const maxFeePerGasPromise = this.getLegacyGasPrice();
    const maxPriorityFeePerGasPromise = this.sendRpcCall(
      EthMethodType.MAX_PRIORITY_FEE_PER_GAS,
      [],
    );
    const [maxFeePerGas, maxPriorityFeePerGas] = await Promise.all([
      maxFeePerGasPromise,
      maxPriorityFeePerGasPromise,
    ]);

    return {
      maxFeePerGas: BigInt(maxFeePerGas),
      maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
    };
  }

  async getBalance(address: string): Promise<bigint> {
    const balance = await this.sendRpcCall(EthMethodType.GET_BALANCE, [
      address,
    ]);
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
    return await this.provider.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
  }

  /**
   * Get the nonce of the user
   * @param address address
   * @param pendingNonce include the nonce of the pending transaction
   * @returns by default returns the next nonce of the address
   * if pendingNonce is set to false, returns the nonce of the mined transaction
   */
  async getNonce(address: string, pendingNonce = true): Promise<number> {
    const params = pendingNonce ? [address, "pending"] : [address];
    return await this.sendRpcCall(EthMethodType.GET_TRANSACTION_COUNT, params);
  }

  async sendTransaction(
    rawTransactionData: EVMRawTransactionType,
    account: IEVMAccount,
  ): Promise<string> {
    const rawTransaction: EVMRawTransactionType = rawTransactionData;
    rawTransaction.from = account.getPublicKey();
    const signature = await account.signTransaction(rawTransaction);
    const hash = await this.provider.sendRawTransaction({
      serializedTransaction: signature as `0x${string}`,
    });
    return hash as string;
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
    return await this.provider.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
      confirmations,
      timeout,
    });
  }

  /**
   * @param transactionHash transaction hash
   * @returns transaction once mined, else waits for the transaction to be mined
   */
  async getTransaction(transactionHash: string): Promise<Transaction> {
    return await this.provider.getTransaction({
      hash: transactionHash as `0x${string}`,
    });
  }

  async getLatesBlockNumber(): Promise<bigint> {
    const block = await this.provider.getBlock({
      blockTag: "latest",
    });
    return block.number;
  }

  async runAlchemySimulation(params: any): Promise<any> {
    return await this.sendRpcCall(AlchemyMethodType.SIMULATE_EXECUTION, params);
  }
}
