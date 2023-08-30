import { ICacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { INonceManager } from './interface/INonceManager';
import { EVMNonceManagerParamsType } from './types';

const log = logger(module);
export class EVMNonceManager implements INonceManager<IEVMAccount, EVMRawTransactionType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  constructor(evmNonceManagerParams: EVMNonceManagerParamsType) {
    const {
      options, networkService, cacheService,
    } = evmNonceManagerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.cacheService = cacheService;
  }

  async getNonce(address: string, pending = true): Promise<number> {
    let nonce;
    const accountNonceKey = this.getAccountNonceKey(address);
    nonce = await this.cacheService.get(accountNonceKey);
    log.info(`Nonce from cache for account: ${address} on chainId: ${this.chainId} is ${nonce}`);
    if (!pending) {
      nonce = await this.getAndSetNonceFromNetwork(address, pending);
    } else if (nonce) {
      nonce = parseInt(nonce, 10);
      if (await this.cacheService.get(this.getUsedAccountNonceKey(address, nonce))) {
        log.info(`Nonce ${nonce} for address ${address} is already used. So clearing nonce and getting nonce from network`);
        nonce = await this.getAndSetNonceFromNetwork(address, pending);
      }
    } else {
      log.info(`Fetching nonce from network for account: ${address} on chainId: ${this.chainId}`);
      nonce = await this.getAndSetNonceFromNetwork(address, pending);
    }
    return nonce;
  }

  async markUsed(address: string, nonce: number): Promise<void> {
    await this.cacheService.set(this.getUsedAccountNonceKey(address, nonce), 'true');
  }

  async incrementNonce(address: string): Promise<boolean> {
    return this.cacheService.increment(this.getAccountNonceKey(address), 1);
  }

  async getAndSetNonceFromNetwork(address: string, pending: boolean): Promise<number> {
    const nonceFromNetwork = await this.networkService.getNonce(address, pending);
    log.info(`Nonce from network for account: ${address} on chainId: ${this.chainId} is ${nonceFromNetwork}`);
    await this.cacheService.set(this.getAccountNonceKey(address), nonceFromNetwork.toString());
    return nonceFromNetwork;
  }

  async getAndSetPendingNonceFromNetwork(address: string): Promise<number> {
    const {
      data,
    } = await this.networkService.sendRpcCall('eth_getTransactionCount', [address, 'pending']);
    return data.result;
  }

  private getAccountNonceKey(address: string) : string {
    return `AccountNonce_${address}_${this.chainId}`;
  }

  private getUsedAccountNonceKey(address: string, nonce: number): string {
    return `UsedAccountNonce_${address}_${nonce}_${this.chainId}`;
  }
}
