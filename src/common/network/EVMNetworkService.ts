/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */

import axios, { AxiosResponse } from "axios";
import {
  Hex,
  PublicClient,
  Transaction,
  TransactionReceipt,
  createPublicClient,
  fallback,
  http,
  keccak256,
  toHex,
  verifyMessage,
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
import { BLOCKCHAINS } from "../constants";
import nodeconfig from "config";
import { hideRpcUrlApiKey } from "./utils";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

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

interface IEVMNetworkServiceOptions {
  chainId: number;
  rpcUrls?: string[];
  mevProtectedRpcUrl?: string;
  checkForReceiptIntervalMs?: number;
  checkForReceiptTimeoutMs?: number;
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

  constructor({
    chainId,
    rpcUrls = getRpcUrls(chainId),
    mevProtectedRpcUrl = getDefaultMevProtectedRpcUrl(chainId),
    checkForReceiptIntervalMs = getCheckForReceiptIntervalMs(chainId),
    checkForReceiptTimeoutMs = getCheckReceiptTimeoutMs(chainId),
  }: IEVMNetworkServiceOptions) {
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

    let response: AxiosResponse<any, any>;
    try {
      response = await axios.post(this.rpcUrl, requestData);
    } catch (error) {
      logger.error(`raw RPC call failed with error: ${JSON.stringify(error)}`);
      throw error;
    }
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

  /**
   * Getting the nonce on flasbots requires a signature from the account
   * See https://docs.flashbots.net/flashbots-protect/nonce-management
   * @param account account to get the nonce for
   * @param pending include the nonce of the pending transaction (default: true)
   * @returns nonce of the account
   */
  async getFlashbotsNonce(
    account: IEVMAccount,
    pending = true,
  ): Promise<number> {
    if (!this.mevProtectedRpcUrl) {
      throw new Error(
        `Can't fetch Flashbots nonce if Flashbots RPC URL not set for chainId: ${this.chainId}!`,
      );
    }
    logger.info(`Getting Flashbots nonce for address: ${account.address}`);

    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: pending ? [account.address, "pending"] : [account.address],
      id: Date.now(),
    });

    const signature =
      account.address +
      ":" +
      (await account.signMessage(keccak256(toHex(body))));

    const response = await axios.post(this.mevProtectedRpcUrl, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Flashbots-Signature": signature,
      },
    });

    const data = response.data;

    logger.info(`Flashbots nonce response: ${customJSONStringify(data)}`);

    if (!isFlashbotsNonceResponse(data)) {
      throw new Error(
        `Invalid Flashbots nonce response: ${customJSONStringify(data)}`,
      );
    }

    const nonce = parseInt(data.result, 16);
    logger.info({ address: account.address }, `Flashbots nonce: ${nonce}`);

    return nonce;
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
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await this.provider.estimateFeesPerGas();

      return {
        maxFeePerGas: maxFeePerGas as bigint,
        maxPriorityFeePerGas: maxPriorityFeePerGas as bigint,
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
   * @param pending include the nonce of the pending transaction
   * @returns by default returns the next nonce of the address
   * if pendingNonce is set to false, returns the nonce of the mined transaction
   */
  async getNonce(account: IEVMAccount, pending = true): Promise<number> {
    if (this.mevProtectedRpcUrl) {
      return this.getFlashbotsNonce(account, pending);
    }

    const params = pending ? [account.address, "pending"] : [account.address];
    return this.sendRpcCall(EthMethodType.GET_TRANSACTION_COUNT, params);
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
        // how often we check for the receipt
        const checkForReceiptIntervalMs = getCheckForReceiptIntervalMs(
          this.chainId,
        );
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

interface FlashbotsNonceResponse {
  id: number;
  result: Hex;
  jsonrpc: "2.0";
}

function isFlashbotsNonceResponse(
  response: any,
): response is FlashbotsNonceResponse {
  return (
    response &&
    response.id &&
    response.result &&
    response.jsonrpc === "2.0" &&
    typeof response.result === "string"
  );
}
