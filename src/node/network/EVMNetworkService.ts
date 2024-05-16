/* eslint-disable no-async-promise-executor */
/* eslint-disable import/no-import-module-exports */
/* eslint-disable @typescript-eslint/return-await */
// eslint-disable-next-line max-classes-per-file
import {
  EstimateGasParameters,
  PublicClient,
  Transaction,
  TransactionReceipt,
  createPublicClient,
  http,
} from "viem";
import { loadBalance } from "@ponder/utils";
import { ErrorCheckingTransactionReceipt } from "./ErrorCheckingTransactionReceipt";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../common/types";
import { customJSONStringify } from "../../common/utils";
import { IEVMAccount } from "../account";
import { INetworkService } from "./interface";
import { config } from "../../common/config";
import { logger } from "../../common/logger";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMNetworkService
  implements
    INetworkService<
      IEVMAccount,
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >
{
  chainId: number;

  publicClient: PublicClient;

  constructor(options: { chainId: number }) {
    this.chainId = options.chainId;

    const providers = config.chains.providers[this.chainId];
    if (!providers) {
      throw new Error(
        `No providers found for chainId: ${this.chainId} in the config`,
      );
    }

    this.publicClient = createPublicClient({
      transport: loadBalance(
        config.chains.providers[this.chainId].map((p) => http(p.url)),
      ),
    });
  }

  /**
   *
   * Fetches the network base fee for EIP 1559 networks
   * @returns {bigint} baseFeePerGas
   */
  async getBaseFeePerGas(): Promise<bigint> {
    const block = await this.publicClient.getBlock({
      blockTag: "latest",
    });
    if (typeof block.baseFeePerGas !== "bigint") {
      return BigInt(0);
    }
    return block.baseFeePerGas;
  }

  /**
   * Fetches the network gas price for non 1559 networks
   * @returns {bigint} gasPrice
   */
  async getLegacyGasPrice(): Promise<bigint> {
    return await this.publicClient.getGasPrice();
  }

  /**
   * Fetches maxFeePerGas and maxPriorityFeePerGas for EIP 1559 networks
   * @returns {Type2TransactionGasPriceType} maxPriorityFeePerGas and maxFeePerGas
   */
  async getEIP1559FeesPerGas(): Promise<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }> {
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await this.publicClient.estimateFeesPerGas();
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      throw new Error(
        `Error in fetching fee values for chainId: ${this.chainId}`,
      );
    }
    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  /**
   * Fetches latest balance for a given address
   * @param address
   * @returns {bigint} balance
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.publicClient.getBalance({
      address: address as `0x${string}`,
    });
  }

  /**
   * Estimate gas for a transaction or revert
   * @param params parameters required for the method to be encoded
   * @returns estimate gas for the transaction in big number
   */

  async estimateGas(params: EstimateGasParameters): Promise<bigint> {
    return await this.publicClient.estimateGas(params);
  }

  /**
   * Get the nonce of an address
   * @param address address
   * @param pendingNonce include the nonce of the pending transaction
   * @returns by default returns the next nonce of the address
   * if pendingNonce is set to false, returns the nonce of the mined transaction
   */
  async getNonce(address: string, pendingNonce = true): Promise<number> {
    const blockTag = pendingNonce ? "pending" : "latest";
    return await this.publicClient.getTransactionCount({
      address: address as `0x${string}`,
      blockTag,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async sendTransaction(
    rawTransactionData: EVM1559RawTransaction | EVMLegacyRawTransaction,
    account: IEVMAccount,
  ): Promise<`0x${string}`> {
    const rawTransaction: EVM1559RawTransaction | EVMLegacyRawTransaction =
      rawTransactionData;
    return await account.sendTransaction(rawTransaction);
  }

  async getTransactionReceipt(
    transactionHash: string,
  ): Promise<TransactionReceipt | null> {
    // TODO might have to parse this receipt and make sure types are consistent with what direct RPC call returns
    return await this.publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
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
      return await this.publicClient.getTransaction({
        hash: transactionHash as `0x${string}`,
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Method fetches the latest block number
   * @returns {bigint} block number
   */
  async getLatesBlockNumber(): Promise<bigint> {
    const block = await this.publicClient.getBlock({
      blockTag: "latest",
    });
    return block.number;
  }
}
