/* eslint-disable import/no-import-module-exports */
import NodeCache from "node-cache";
import { ICacheService } from "../../common/cache";
import { logger } from "../../common/logger";
import { INetworkService } from "../../common/network";
import { EVMRawTransactionType } from "../../common/types";
import { parseError } from "../../common/utils";
import { IEVMAccount } from "../account";
import { INonceManager } from "./interface/INonceManager";
import { EVMNonceManagerParamsType } from "./types";

const log = logger.child({
  module: module.filename.split("/").slice(-4).join("/"),
});

export class EVMNonceManager
  implements INonceManager<IEVMAccount, EVMRawTransactionType>
{
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  pendingNonceTracker: NodeCache;

  usedNonceTracker: NodeCache;

  constructor(evmNonceManagerParams: EVMNonceManagerParamsType) {
    const { options, networkService, cacheService } = evmNonceManagerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.cacheService = cacheService;
    this.pendingNonceTracker = new NodeCache({
      stdTTL: options.nonceExpiryTTL,
    });
    this.usedNonceTracker = new NodeCache();
  }

  async getNonce(address: string): Promise<number> {
    let nonce: number | undefined;
    try {
      nonce = this.pendingNonceTracker.get(address.toLowerCase());
      log.info(
        `Nonce from pendingNonceTracker for account: ${address} on chainId: ${this.chainId} is ${nonce}`,
      );

      if (typeof nonce === "number") {
        if (nonce === this.usedNonceTracker.get(address.toLowerCase())) {
          log.info(
            `Nonce ${nonce} for address ${address} is already used on chainId: ${this.chainId}. So clearing nonce and getting nonce from network`,
          );
          nonce = await this.getAndSetNonceFromNetwork(address);
        }
      } else {
        nonce = await this.getAndSetNonceFromNetwork(address);
      }
      return nonce;
    } catch (error) {
      log.error(
        `Error in getting nonce for address: ${address} on chainId: ${
          this.chainId
        } with error: ${parseError(error)}`,
      );
      log.info(
        `Fetching nonce from network for address: ${address} on chainId: ${this.chainId}`,
      );
      return await this.getAndSetNonceFromNetwork(address);
    }
  }

  async markUsed(address: string, nonce: number): Promise<void> {
    this.usedNonceTracker.set(address.toLowerCase(), nonce);
  }

  async incrementNonce(address: string): Promise<boolean> {
    this.pendingNonceTracker.set(
      address.toLowerCase(),
      this.pendingNonceTracker.get(address.toLowerCase() + 1) as number,
    );
    return true;
  }

  async getAndSetNonceFromNetwork(address: string): Promise<number> {
    const nonceFromNetwork = await this.networkService.getNonce(address);
    log.info(
      `Nonce from network for account: ${address} on chainId: ${this.chainId} is ${nonceFromNetwork}`,
    );
    this.pendingNonceTracker.set(address.toLowerCase(), nonceFromNetwork);
    return nonceFromNetwork;
  }
}
