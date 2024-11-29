import axios, { AxiosInstance, AxiosResponse, isAxiosError } from "axios";
import config from "config";
import {
  createPublicClient,
  Hex,
  http,
  keccak256,
  PublicClient,
  toHex,
} from "viem";
import path from "path";
import axiosRetry from "axios-retry";
import { logger } from "../logger";
import { customJSONStringify } from "../utils";
import { IEVMAccount } from "../../relayer/account/interface/IEVMAccount";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

/**
 * Flashbots configuration options.
 * @param sendTransactionUrl URL used for sending private transactions to Flashbots
 * @param getTransactionUrl URL used for getting the status of a transaction
 * @param getStatusIntervalDelay Delay multiplier for the status interval
 */
export interface FlashbotsOptions {
  rpcUrl: string;
  statusUrl: string;
  getStatusIntervalDelay: number;
  maxBlockWait: number;
  supportedNetworks: number[];
}

/**
 * Flashbots client for sending transactions and checking their status.
 * @param options Flashbots configuration
 * @param rpcClient PublicClient for getting the current block number
 * @param httpClient Axios instance for sending requests
 */
export class FlashbotsClient {
  constructor(
    public options: FlashbotsOptions = getFlashbotsConfig(),
    private rpcClient: Pick<
      PublicClient,
      "getBlockNumber"
    > = createPublicClient({
      transport: http(options.rpcUrl),
    }),
    // TS hack to handle this axios problem: https://github.com/axios/axios/issues/5095
    private httpClient?: Pick<AxiosInstance, "get" | "post"> & {
      create: typeof axios.create;
    },
  ) {
    if (!httpClient) {
      const newHttpClient = axios.create();
      axiosRetry(newHttpClient, { retryDelay: axiosRetry.exponentialDelay });
      // again we have to do 'as any' because of https://github.com/axios/axios/issues/5095
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.httpClient = newHttpClient as any;
    }
  }

  /**
   * Waits for a Flashbots transaction to be included in a block.
   * Polls the Flashbots status API until the transaction is included or times out.
   * @param transactionHash Transaction hash
   * @returns Flashbots status response
   */
  async waitForTransaction(
    transactionHash: string,
  ): Promise<FlashbotsStatusResponse> {
    const _log = log.child({ transactionHash });

    if (!this.httpClient) {
      throw new Error("FlashbotsClient httpClient is not initialized");
    }

    // get current block so we can determine the max block
    const currentBlock = Number(await this.rpcClient.getBlockNumber());

    // by default a Flashbots transaction times out if it's not included within 25 blocks
    const maxBlock = currentBlock + this.options.maxBlockWait;

    // it should be safe to clone the client because axios.create just copies the config
    // and we have no keep-alive connections
    const statusClient = this.httpClient.create();

    // configure the httpClient so it retries until max block is reached
    // and performs exponential backoff to handle rate limiting
    axiosRetry(statusClient, {
      retries: 100, // Sanity check: this won't be reached because we have a retryCondition
      // if the transaction is not included within 25 blocks, we should stop retrying
      retryCondition: async () => {
        const currentBlock = await this.rpcClient.getBlockNumber();
        return currentBlock < maxBlock;
      },
      // this is how long we wait between retries
      retryDelay: (retryCount) => {
        return retryCount * this.options.getStatusIntervalDelay; // 5s, 10s, 15s, 30s, 60s, ...
      },
      // this exists only to log each retry
      onRetry: (retryCount, error) => {
        const { code, message, cause } = error;
        _log.warn(
          { retryCount, maxBlock, code, message, cause },
          "Retrying Flashbots transaction status",
        );
      },
      // we want to stop retrying if the tx is included or failed
      validateResponse: (response: AxiosResponse): boolean => {
        if (isFlashbotsStatusResponse(response.data)) {
          return [
            FlashbotsTxStatus.INCLUDED,
            FlashbotsTxStatus.FAILED,
          ].includes(response.data.status);
        }

        return false;
      },
    });

    try {
      const statusPath = path.join(this.options.statusUrl, transactionHash);
      _log.info({ maxBlock, statusPath }, "Waiting for Flashbots transaction");

      const response =
        await statusClient.get<FlashbotsStatusResponse>(statusPath);

      return response.data;
    } catch (err) {
      const label = "Error waiting for Flashbots transaction";
      if (isAxiosError(err)) {
        const { message, code, cause } = err;
        _log.error({ message, code, cause }, label);
      } else {
        _log.error({ err }, label);
      }
      throw err;
    }
  }

  /**
   * Getting the nonce on flasbots requires a signature from the account
   * See https://docs.flashbots.net/flashbots-protect/nonce-management
   * @param account account to get the nonce for
   * @param pending include the nonce of the pending transaction (default: true)
   * @returns nonce of the account
   */
  async getNonce(account: IEVMAccount, pending = true): Promise<number> {
    const { address } = account;
    const _log = logger.child({ address, pending });

    if (!this.httpClient) {
      throw new Error("FlashbotsClient httpClient is not initialized");
    }

    _log.info(`Getting Flashbots nonce`);

    const body = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: pending ? [account.address, "pending"] : [account.address],
      id: Date.now(),
    });

    const signedBody = await account.signMessage(keccak256(toHex(body)));
    const signature = `${account.address}:${signedBody}`;

    const response = await this.httpClient.post<FlashbotsNonceResponse>(
      this.options.rpcUrl,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Flashbots-Signature": signature,
        },
      },
    );

    const { data } = response;

    if (!isFlashbotsNonceResponse(data)) {
      throw new Error(
        `Invalid Flashbots nonce response: ${customJSONStringify(data)}`,
      );
    }

    const nonce = parseInt(data.result, 16);
    logger.info({ address: account.address }, `Flashbots nonce: ${nonce}`);

    return nonce;
  }
}

/**
 * The default Flashbots configuration read from the config file.
 * All values have defaults in default.json.
 * A custom sendTransactionUrl (for example specifying a private read RPC URL)
 * can (and should) be set in development.json or production.json.
 * @returns Default Flashbots configuration
 */
export const getFlashbotsConfig = (): FlashbotsOptions => {
  return {
    rpcUrl: config.get<string>("flashbots.rpcUrl"),
    statusUrl: config.get<string>("flashbots.statusUrl"),
    getStatusIntervalDelay: config.get<number>(
      `flashbots.getStatusIntervalDelay`,
    ),
    maxBlockWait: config.get<number>(`flashbots.maxBlockWait`),
    supportedNetworks: config.get<number[]>("flashbots.supportedNetworks"),
  };
};

export enum FlashbotsTxStatus {
  PENDING = "PENDING",
  INCLUDED = "INCLUDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN",
}

export interface FlashbotsStatusResponse {
  status: FlashbotsTxStatus;
  hash: string;
  maxBlockNumber: number;
  transaction: FlashbotsTransactionResponse;
  fastMode: boolean;
  seenInMempool: boolean;
}

function isFlashbotsStatusResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
): response is FlashbotsStatusResponse {
  return response && response.status;
}

export interface FlashbotsTransactionResponse {
  from: string;
  to: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: string;
  value: string;
}

interface FlashbotsNonceResponse {
  id: number;
  result: Hex;
  jsonrpc: "2.0";
}

function isFlashbotsNonceResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any,
): response is FlashbotsNonceResponse {
  return response.result && typeof response.result === "string";
}
