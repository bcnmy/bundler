/* eslint-disable no-async-promise-executor */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable new-cap */
import axios from "axios";
import nodeconfig from "config";
import {
  PublicClient,
  Transaction,
  TransactionReceipt,
  createPublicClient,
  fallback,
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
import { ErrorCheckingTransactionReceipt } from "./errors";
import { RpcProvider } from "../../config/interface/IConfig";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

const LOAD_BALANCER_DEFAULT = {
  rank: {
    interval: 60_000,
    sampleCount: 5,
    timeout: 500,
    weights: {
      latency: 0.3,
      stability: 0.7,
    },
  },
};

export class EVMNetworkService
  implements INetworkService<IEVMAccount, EVMRawTransactionType>
{
  chainId: number;

  client: PublicClient;

  providers: RpcProvider[];

  constructor(options: { chainId: number; client?: PublicClient }) {
    this.chainId = options.chainId;

    this.providers = nodeconfig.get<RpcProvider[]>(
      `chains.providers.${this.chainId}`,
    );

    if (options.client) {
      this.client = options.client;
    } else if (this.providers.length > 1) {
      this.client = createPublicClient({
        transport: fallback(
          this.providers.map((p) => http(p.url)),
          LOAD_BALANCER_DEFAULT,
        ),
      });
    } else {
      this.client = createPublicClient({
        transport: http(this.providers[0].url),
      });
    }
  }

  async sendRpcCall(method: string, params: Array<any>): Promise<any> {
    const requestData = {
      method,
      params,
      jsonrpc: "2.0",
      id: Date.now(),
    };
    const response = await axios.post(this.providers[0].url, requestData);
    const { data } = response;
    log.info(
      `data from RPC call: ${customJSONStringify(
        data,
      )} received on JSON RPC Method: ${method} with params: ${customJSONStringify(
        params,
      )} on chainId: ${this.chainId}`,
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
    const block = await this.client.getBlock({
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
      "latest",
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

  // eslint-disable-next-line class-methods-use-this
  async sendTransaction(
    rawTransactionData: EVMRawTransactionType,
    account: IEVMAccount,
  ): Promise<string | Error> {
    const rawTransaction: EVMRawTransactionType = rawTransactionData;
    const hash = await account.sendTransaction(rawTransaction);
    return hash as string;
  }

  async getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt | null> {
    const response = await this.sendRpcCall(
      EthMethodType.GET_TRANSACTION_RECEIPT,
      [transactionHash],
    );
    return response;
  }

  /**
   * @param transactionHash transaction hash
   * @param transactionId transaction application id, specific for our implementation
   * @returns receipt of the transaction once mined, else waits for the transaction to be mined
   */
  async waitForTransaction(
    transactionHash: string,
    transactionId: string,
  ): Promise<TransactionReceipt> {
    try {
      log.info(
        `Starting waitForTransaction polling on transactionHash: ${transactionHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );

      // See https://viem.sh/docs/actions/public/waitForTransactionReceipt.html
      const response = await this.client.waitForTransactionReceipt({
        hash: transactionHash as `0x${string}`,
        timeout: nodeconfig.get(
          "EVMNetworkService.waitForTransaction.timeoutMs",
        ),
        pollingInterval: nodeconfig.get(
          "EVMNetworkService.waitForTransaction.pollingIntervalMs",
        ),
        retryCount: nodeconfig.get(
          "EVMNetworkService.waitForTransaction.retryCount",
        ),
      });

      log.info(
        `waitForTransactionReceipt from provider response: ${customJSONStringify(
          response,
        )} for transactionHash: ${transactionHash} for transactionId: ${transactionId} on chainId: ${
          this.chainId
        }`,
      );

      return response;
    } catch (err) {
      const wrappedError = new ErrorCheckingTransactionReceipt(
        err,
        transactionHash,
        transactionId,
        this.chainId,
      );
      log.error(wrappedError.message);
      throw wrappedError;
    }
  }

  /**
   * @param transactionHash transaction hash
   * @returns transaction once mined, else waits for the transaction to be mined
   */
  async getTransaction(transactionHash: string): Promise<Transaction | null> {
    try {
      return await this.client.getTransaction({
        hash: transactionHash as `0x${string}`,
      });
    } catch (error) {
      return null;
    }
  }

  async getLatestBlockNumber(): Promise<bigint> {
    const block = await this.client.getBlock({
      blockTag: "latest",
    });
    return block.number;
  }

  async runAlchemySimulation(params: any): Promise<any> {
    return await this.sendRpcCall(AlchemyMethodType.SIMULATE_EXECUTION, params);
  }
}
