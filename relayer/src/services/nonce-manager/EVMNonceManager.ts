import { ICacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { parseError } from '../../../../common/utils';
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

  async getNonce(address: string): Promise<number> {
    let nonce;
    try {
      const accountNonceKey = this.getAccountNonceKey(address);
      nonce = await this.cacheService.get(accountNonceKey);
      log.info(`Nonce from cache for account: ${address} on chainId: ${this.chainId} is ${nonce}`);

      if (nonce != null && nonce !== 'undefined') {
        nonce = parseInt(nonce, 10);
        if (await this.cacheService.get(this.getUsedAccountNonceKey(address, nonce))) {
          log.info(`Nonce ${nonce} for address ${address} is already used on chainId: ${this.chainId}. So clearing nonce and getting nonce from network`);
          nonce = await this.getAndSetNonceFromNetwork(address);
        }
      } else {
        nonce = await this.getAndSetNonceFromNetwork(address);
      }
      return nonce;
    } catch (error) {
      log.error(`Error in getting nonce for address: ${address} on chainId: ${this.chainId} with error: ${parseError(error)}`);
      log.info(`Fetching nonce from network for address: ${address} on chainId: ${this.chainId}`);
      return await this.getAndSetNonceFromNetwork(address);
    }
  }

  async markUsed(address: string, nonce: number): Promise<void> {
    await this.cacheService.set(this.getUsedAccountNonceKey(address, nonce), 'true');
  }

  async incrementNonce(address: string): Promise<boolean> {
    return this.cacheService.increment(this.getAccountNonceKey(address), 1);
  }

  async getAndSetNonceFromNetwork(address: string): Promise<number> {
    const nonceFromNetwork = await this.networkService.getNonce(address);
    log.info(`Nonce from network for account: ${address} on chainId: ${this.chainId} is ${nonceFromNetwork}`);
    await this.cacheService.set(this.getAccountNonceKey(address), nonceFromNetwork.toString());
    return nonceFromNetwork;
  }

  private getAccountNonceKey(address: string) : string {
    return `AccountNonce_${address}_${this.chainId}`;
  }

  private getUsedAccountNonceKey(address: string, nonce: number): string {
    return `UsedAccountNonce_${address}_${nonce}_${this.chainId}`;
  }
}
