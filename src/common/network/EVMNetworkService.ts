/* eslint-disable no-async-promise-executor */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
/* eslint-disable new-cap */
// eslint-disable-next-line max-classes-per-file
import axios from "axios";
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
import { customJSONStringify, parseError } from "../utils";
import { config } from "../../config";
import { BLOCKCHAINS } from "../constants";

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

class ErrorCheckingTransactionReceipt extends Error {
  constructor(
    error: any,
    transactionHash: string,
    transactionId: string,
    chainId: number,
  ) {
    super(
      `Error checking transaction receipt: ${parseError(
        error,
      )} for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${chainId}`,
    );
  }
}

export class EVMNetworkService
  implements INetworkService<IEVMAccount, EVMRawTransactionType>
{
  chainId: number;

  rpcUrl: string;

  provider: PublicClient;

  constructor(options: { chainId: number; rpcUrl: string }) {
    this.chainId = options.chainId;
    this.rpcUrl = options.rpcUrl;

    const providers = config.chains.providers[this.chainId];
    if (!providers) {
      throw new Error(
        `No providers found for chainId: ${this.chainId} in the config`,
      );
    }

    if (providers.length > 1) {
      this.provider = createPublicClient({
        transport: fallback(
          config.chains.providers[this.chainId].map((p) => http(p.url)),
          LOAD_BALANCER_DEFAULT,
        ),
      });
    } else {
      this.provider = createPublicClient({
        transport: http(providers[0].url),
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
    const response = await axios.post(this.rpcUrl, requestData);
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
    const block = await this.provider.getBlock({
      blockTag: "latest",
    });
    if (typeof block.baseFeePerGas !== "bigint") {
      return BigInt(0);
    }
    return block.baseFeePerGas;
  }

  async getChainId(): Promise<number> {
    return this.provider.getChainId();
  }

  async getLegacyGasPrice(): Promise<Type0TransactionGasPriceType> {
    return BigInt(await this.sendRpcCall(EthMethodType.GAS_PRICE, []));
  }

  async getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType> {
    // Using viem's estimateFeesPerGas instead of raw RPC call as Ankr sometimes
    // gives unexpected errors
    if (this.chainId === BLOCKCHAINS.GNOSIS_MAINNET) {
      const {
        maxFeePerGas,
        maxPriorityFeePerGas
      } = await this.provider.estimateFeesPerGas();

      return {
        maxFeePerGas: maxFeePerGas as bigint,
        maxPriorityFeePerGas: maxPriorityFeePerGas as bigint
      };
    }
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
   * @returns receipt of the transaction once mined, else waits for the transaction to be mined
   */
  async waitForTransaction(
    transactionHash: string,
    transactionId: string,
    // confirmations?: number,
    // timeout?: number,
  ): Promise<TransactionReceipt> {
    log.info(
      `Starting waitFortransaction polling on transactionHash: ${transactionHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
    );

    const response: TransactionReceipt | null = await new Promise(
      async (resolve, reject) => {
        // Set interval to check every 1 second (adjust the interval as needed)
        const intervalId = setInterval(async () => {
          try {
            log.info(
              `Polling started to fetch receipt for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${this.chainId}`,
            );
            const transactionReceipt =
              await this.getTransactionReceipt(transactionHash);

            const isTransactionMined =
              transactionReceipt &&
              ((transactionReceipt.status as unknown as string) === "0x1" ||
                (transactionReceipt.status as unknown as string) === "0x0");

            if (isTransactionMined) {
              // Transaction resolved successfully
              log.info(
                `Transaction receipt: ${customJSONStringify(
                  transactionReceipt,
                )} fetched for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${
                  this.chainId
                }`,
              );
              clearInterval(intervalId);
              resolve(transactionReceipt);
            } else {
              // Transaction is still pending
              log.info(
                `Transaction is still pending for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${this.chainId}`,
              );
            }
          } catch (error) {
            const wrappedError = new ErrorCheckingTransactionReceipt(
              error,
              transactionHash,
              transactionId,
              this.chainId,
            );
            log.error(wrappedError.message);
            clearInterval(intervalId);
            reject(wrappedError);
          }
        }, 1000);

        // Uncomment the line below to stop the interval after a certain number of iterations (optional)
        setTimeout(
          () => {
            clearInterval(intervalId);
            reject(
              new Error(
                "Timeout: The transaction is taking too long to confirm.",
              ),
            );
          },
          1 * 60 * 1000,
        );
      },
    );
    log.info(
      `waitForTransactionReceipt from provider response: ${customJSONStringify(
        response,
      )} for transactionHash: ${transactionHash} for transactionId: ${transactionId} on chainId: ${
        this.chainId
      }`,
    );
    if (response === null) {
      throw new Error(
        `Error in fetching transactionReceipt for transactionHash: ${transactionHash} for transactionId: ${transactionId} on chainId: ${this.chainId}`,
      );
    }
    return response;
  }

  /**
   * @param transactionHash transaction hash
   * @returns transaction once mined, else waits for the transaction to be mined
   */
  async getTransaction(transactionHash: string): Promise<Transaction | null> {
    try {
      return await this.provider.getTransaction({
        hash: transactionHash as `0x${string}`,
      });
    } catch (error) {
      return null;
    }
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
