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

  async getNonce(relayer: IEVMAccount): Promise<number> {
    const _log = log.child({
      relayerAddress: relayer.address,
      chainId: this.chainId,
    });

    let nonce: number | undefined;
    try {
      nonce = this.pendingNonceTracker.get(relayer.address.toLowerCase());
      _log.debug(
        `Nonce from pendingNonceTracker for account: ${relayer.address} on chainId: ${this.chainId} is ${nonce}`,
      );

      if (typeof nonce === "number") {
        if (
          nonce === this.usedNonceTracker.get(relayer.address.toLowerCase())
        ) {
          _log.warn(
            `Nonce ${nonce} for address ${relayer.address} is already used. So clearing nonce and getting nonce from network`,
          );
          nonce = await this.getAndSetNonceFromNetwork(relayer);
        }
      } else {
        nonce = await this.getAndSetNonceFromNetwork(relayer);
      }
      return nonce;
    } catch (error) {
      _log.error(
        `Error in getting nonce for address: ${relayer} with error: ${parseError(error)}`,
      );
      _log.info(`Fetching nonce from network for address: ${relayer.address}`);
      return await this.getAndSetNonceFromNetwork(relayer);
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

  async getAndSetNonceFromNetwork(
    account: IEVMAccount,
    pending?: boolean,
  ): Promise<number> {
    const _log = log.child({
      address: account.address,
      chainId: this.chainId,
    });

    const nonceFromNetwork = await this.networkService.getNonce(
      account,
      pending,
    );

    _log.debug(
      `Nonce from network for account: ${account.address} is ${nonceFromNetwork}`,
    );
    this.pendingNonceTracker.set(
      account.address.toLowerCase(),
      nonceFromNetwork,
    );
    return nonceFromNetwork;
  }
}
