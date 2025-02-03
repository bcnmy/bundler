/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */

import axios, { AxiosResponse } from "axios";
import axiosRetry from "axios-retry";
import {
  Hex,
  PublicClient,
  Transaction,
  TransactionReceipt,
  createPublicClient,
  fallback,
  http,
  parseGwei,
  verifyMessage,
} from "viem";
import { IEVMAccount } from "../../relayer/account";
import { EVMRawTransactionType } from "../types";
import { INetworkService } from "./interface";
import {
  Type0TransactionGasPriceType,
  Type2TransactionGasPriceType,
} from "./types";
import { logger } from "../logger";
import { parseError } from "../utils";
import { BLOCKCHAINS } from "../constants";
import nodeconfig from "config";
import { hideRpcUrlApiKey } from "./utils";
import { FlashbotsClient, FlashbotsOptions } from "./FlashbotsClient";
import { EthMethods } from "../../server/api/methods/eth";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

interface IEVMNetworkServiceOptions {
  chainId: number;
  rpcUrls?: string[];
  mevProtectedRpcUrl?: string;
  checkForReceiptIntervalMs?: number;
  checkForReceiptTimeoutMs?: number;
  flashbots?: FlashbotsOptions;
}

export class EVMNetworkService
  implements INetworkService<IEVMAccount, EVMRawTransactionType>
{
  readonly chainId: number;

  // These are regular RPC URL providers we use for most calls
  rpcUrls: string[];
  provider: PublicClient;

  // This is an optional MEV-protected RPC URL if the chain has a private mempool solution like Flashbots
  mevProtectedRpcUrl: string | undefined;

  // Interval in milliseconds to check for transaction receipt
  private checkForReceiptIntervalMs: number;

  // Stop checking for receipt after this timeout
  private checkForReceiptTimeoutMs: number;

  constructor(
    {
      chainId,
      rpcUrls = getRpcUrls(chainId),
      mevProtectedRpcUrl = getDefaultMevProtectedRpcUrl(chainId),
      checkForReceiptIntervalMs = getCheckForReceiptIntervalMs(chainId),
      checkForReceiptTimeoutMs = getCheckReceiptTimeoutMs(chainId),
    }: IEVMNetworkServiceOptions,
    // A Flashbots client for sending transactions to a private mempool
    public flashbots?: FlashbotsClient,
    // A private axios client with retry mechanism to handle flaky requests
    private axiosClient = axios.create(),
  ) {
    this.chainId = chainId;

    // Sanity check if the rpcUrls are not passed as an argument and missing from the default config
    this.rpcUrls = rpcUrls;
    if (this.rpcUrls.length === 0) {
      throw new Error(
        `No RPC URLs set for chainId: ${this.chainId} in the config`,
      );
    }

    // If we have only one RPC URL, we create just an ordinary 'http' transport
    // otherwise we use the 'fallback' transport for improved reliability in case of RPC provider issues
    if (this.rpcUrls.length === 1) {
      this.provider = createPublicClient({
        transport: http(this.rpcUrls[0]),
      });
    } else {
      this.provider = createPublicClient({
        transport: fallback(
          this.rpcUrls.map((url) => http(url)),
          nodeconfig.get("networkService.viemFallbackTransport.rank"),
        ),
      });
    }

    // If provided a MEV-protected RPC URL we use it for sending tx's to a private mempool to avoid frontrunning
    this.mevProtectedRpcUrl = mevProtectedRpcUrl;

    // Check for the transaction receipt every `checkForReceiptIntervalMs` milliseconds
    this.checkForReceiptIntervalMs = checkForReceiptIntervalMs;

    // Stop checking for receipt after this timeout
    this.checkForReceiptTimeoutMs = checkForReceiptTimeoutMs;

    // Add a retry plugin to the axios client to handle flaky requests with exponential backoff
    axiosRetry(this.axiosClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
    });

    // Flashbots configuration for sending transactions to a private mempool
    this.flashbots = flashbots;
  }

  /**
   * Getter for an rpcUrl, used for backwards compatibility when we supported only 1 per network
   * @returns the first RPC URL from the list
   */
  public get rpcUrl(): string {
    return this.rpcUrls[0];
  }

  /**
   * Used for pretty printing the network service configuration
   * @returns JSON stringified object with API keys removed
   */
  toJSON(): IEVMNetworkServiceOptions {
    return {
      chainId: this.chainId,
      rpcUrls: this.rpcUrls.map((rpcUrl) => hideRpcUrlApiKey(rpcUrl)),
      mevProtectedRpcUrl: this.mevProtectedRpcUrl
        ? hideRpcUrlApiKey(this.mevProtectedRpcUrl)
        : undefined,
      checkForReceiptIntervalMs: this.checkForReceiptIntervalMs,
      checkForReceiptTimeoutMs: this.checkForReceiptTimeoutMs,
    };
  }

  async sendRpcCall(method: string, params: Array<any>): Promise<any> {
    const requestData = {
      method,
      params,
      jsonrpc: "2.0",
      id: Date.now(),
    };

    const _log = log.child({
      rpcUrl: hideRpcUrlApiKey(this.rpcUrl),
      requestData,
      chainId: this.chainId,
    });

    let response: AxiosResponse<any, any>;
    try {
      response = await axios.post<AxiosResponse>(this.rpcUrl, requestData);
    } catch (err) {
      _log.error({ err }, `Error in EVMNetworkService.sendRpcCall`);
      throw err;
    }
    const { data } = response;
    _log.debug({ result: data.result }, `RPC response received`);
    if (!data) {
      _log.error(`RPC Call returned no data`);
      return null;
    }
    if (data.error) {
      const { code, message } = data.error;
      _log.error(
        {
          code,
          message,
        },
        `RPC Call returned an error`,
      );

      if (
        method === EthMethods.eth_call ||
        method === EthMethods.eth_estimateGas
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
    return BigInt(await this.sendRpcCall(EthMethods.eth_gasPrice, []));
  }

  async getEIP1559FeesPerGas(): Promise<Type2TransactionGasPriceType> {
    // Using viem's estimateFeesPerGas instead of raw RPC call as Ankr sometimes
    // gives unexpected errors
    if (this.chainId === BLOCKCHAINS.GNOSIS_MAINNET) {
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await this.provider.estimateFeesPerGas();

      return {
        maxFeePerGas: maxFeePerGas as bigint,
        maxPriorityFeePerGas: maxPriorityFeePerGas as bigint,
      };
    }
    const maxFeePerGasPromise = this.getLegacyGasPrice();
    const maxPriorityFeePerGasPromise = this.sendRpcCall(
      EthMethods.eth_maxPriorityFeePerGas,
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

  async getBlockNativeFeesPerGas(confidenceLevel?: number) {
    if (!this.supportsBlockNative) {
      throw new Error(`Blocknative not supported for chainId: ${this.chainId}`);
    }

    if (!nodeconfig.has("blocknative.apiKey")) {
      throw new Error("Blocknative API key not set in the config");
    }

    confidenceLevel =
      confidenceLevel || nodeconfig.get("blocknative.confidenceLevel");

    const blockNativeGasFees = await this.axiosClient.get<BlockNativeResponse>(
      `https://api.blocknative.com/gasprices/blockprices?chainId=${this.chainId}&confidenceLevels=${confidenceLevel}`,
      {
        headers: {
          Authorization: nodeconfig.get("blocknative.apiKey"),
        },
      },
    );
    logger.info(
      { blockNativeGasFees: blockNativeGasFees.data },
      `Blocknative gas fees received`,
    );

    const { maxFeePerGas, maxPriorityFeePerGas } =
      blockNativeGasFees.data.blockPrices[0].estimatedPrices[0];

    return {
      maxFeePerGas: parseGwei(maxFeePerGas.toString()),
      maxPriorityFeePerGas: parseGwei(maxPriorityFeePerGas.toString()),
    };
  }

  public get supportsBlockNative() {
    return nodeconfig
      .get<number[]>("blocknative.supportedNetworks")
      .includes(this.chainId);
  }

  async getBalance(address: string): Promise<bigint> {
    const balance = await this.sendRpcCall(EthMethods.eth_getBalance, [
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
    return await this.sendRpcCall(EthMethods.eth_estimateGas, params);
  }

  async ethCall(params: any): Promise<any> {
    return await this.sendRpcCall(EthMethods.eth_call, params);
  }

  /**
   * Get the nonce of the user
   * @param address address
   * @param pending include the nonce of the pending transaction
   * @returns by default returns the next nonce of the address
   * if pendingNonce is set to false, returns the nonce of the mined transaction
   */
  async getNonce(account: IEVMAccount, pending = true): Promise<number> {
    if (this.supportsFlashbots && this.flashbots != null) {
      return this.flashbots.getNonce(account, pending);
    }

    return this.getNetworkNonce(account, pending);
  }

  async getNetworkNonce(account: IEVMAccount, pending = true): Promise<number> {
    const params = pending ? [account.address, "pending"] : [account.address];
    return this.sendRpcCall(EthMethods.eth_getTransactionCount, params);
  }

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
      EthMethods.eth_getTransactionReceipt,
      [transactionHash],
    );
    return response;
  }

  // TODO: Use this instead of checking for MEV protected RPC URL
  public get supportsFlashbots(): boolean {
    return (
      this.flashbots != null &&
      this.flashbots.options.supportedNetworks.includes(this.chainId)
    );
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
    const _log = log.child({
      transactionHash,
      transactionId,
      chainId: this.chainId,
    });

    _log.info(`Start EVMNetworkService.waitForTransaction`);

    const response: TransactionReceipt | null = await new Promise(
      async (resolve, reject) => {
        // how often we check for the receipt
        const checkForReceiptIntervalMs = getCheckForReceiptIntervalMs(
          this.chainId,
        );
        const intervalId = setInterval(async () => {
          try {
            _log.info(`Polling for receipt started`);
            const transactionReceipt =
              await this.getTransactionReceipt(transactionHash);

            const isTransactionMined =
              transactionReceipt &&
              ((transactionReceipt.status as unknown as string) === "0x1" ||
                (transactionReceipt.status as unknown as string) === "0x0");

            if (isTransactionMined) {
              // Transaction resolved successfully
              _log.info({ transactionReceipt }, "Received transaction receipt");
              clearInterval(intervalId);
              resolve(transactionReceipt);
            } else {
              // Transaction is still pending
              _log.info(`Transaction is still pending`);
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
        }, checkForReceiptIntervalMs);

        // Uncomment the line below to stop the interval after a certain number of iterations (optional)
        const stopCheckingAfterMs = getCheckReceiptTimeoutMs(this.chainId);

        setTimeout(() => {
          clearInterval(intervalId);
          reject(
            new Error(
              "Timeout: The transaction is taking too long to confirm.",
            ),
          );
        }, stopCheckingAfterMs);
      },
    );

    _log.info(
      {
        response,
      },
      `EVMNetworkService.waitForTransaction response received`,
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return null;
    }
  }

  async getLatestBlockNumber(): Promise<bigint> {
    const block = await this.provider.getBlock({
      blockTag: "latest",
    });
    return block.number;
  }

  // TODO: Move this to EVMAccount
  async verifySignature(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    log.info(
      `Verifying signature for address: ${address}, message: ${message}, signature: ${signature}`,
    );

    return verifyMessage({
      address: address as Hex,
      message,
      signature: signature as Hex,
    });
  }
}

/**
 * Get the RPC URLs for the chain from the config
 * @param chainId Chain Id
 * @returns A list of RPC URLs for the chain (excluding MEV-protected URLs)
 */
export const getRpcUrls = (chainId: number) => {
  return nodeconfig
    .get<Array<{ url: string; type: string }>>(`chains.providers.${chainId}`)
    .filter((p) => p.type !== "mev-protected")
    .map((p) => p.url);
};

/**
 * Get the MEV-protected RPC URL for the chain from the config
 * @param chainId Chain Id
 * @returns MEV-protected RPC URL for the chain (usually Flashbots)
 */
export const getDefaultMevProtectedRpcUrl = (chainId: number) => {
  return nodeconfig
    .get<Array<{ url: string; type: string }>>(`chains.providers.${chainId}`)
    .find((p) => p.type === "mev-protected")?.url;
};

/**
 * Try get the interval to check for transaction receipt from the config or fallback to default
 * @param chainId Chain Id
 * @returns Interval in milliseconds to check for transaction receipt
 */
const getCheckForReceiptIntervalMs = (chainId: number) => {
  const defaultInterval = 1000; // 1 second

  return nodeconfig.has(`chains.checkForReceiptInterval.${chainId}`)
    ? nodeconfig.get<number>(`chains.checkForReceiptInterval.${chainId}`)
    : defaultInterval;
};

/**
 * Try get the timeout to stop checking for transaction receipt from the config or fallback to default
 * @param chainId Chain Id
 * @returns Timeout in milliseconds to stop checking for transaction receipt
 */
const getCheckReceiptTimeoutMs = (chainId: number) => {
  const defaultTimeout = 60_000; // 60 seconds

  return nodeconfig.has(`chains.checkReceiptTimeout.${chainId}`)
    ? nodeconfig.get<number>(`chains.checkReceiptTimeout.${chainId}`)
    : defaultTimeout;
};

export interface BlockNativeResponse {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  blockPrices: BlockPrice[];
}

export interface BlockPrice {
  blockNumber: number;
  estimatedTransactionCount: number;
  baseFeePerGas: number;
  blobBaseFeePerGas: number;
  estimatedPrices: EstimatedPrice[];
}

export interface EstimatedPrice {
  confidence: number;
  price: number;
  maxPriorityFeePerGas: number;
  maxFeePerGas: number;
}

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
