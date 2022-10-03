import { ICacheService } from '../../../../common/cache';
import { INetworkService } from '../../../../common/network';
import { EVMRawTransactionType } from '../../../../common/types';
import { IEVMAccount } from '../account';
import { INonceManager } from './interface/INonceManager';
import { EVMNonceManagerParamsType } from './types';

export class EVMNonceManager implements INonceManager {
  chainId: number;

  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;

  cacheService: ICacheService;

  constructor(evmNonceManagerParams: EVMNonceManagerParamsType) {
    const {
      options, networkService, cacheService,
    } = evmNonceManagerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.cacheService = cacheService;
  }

  async getNonce(address: string, pendingCount = true): Promise<number> {
    // TODO: review nonce from cache
    return this.getAndSetNonceFromNetwork(address, pendingCount);
    // const nonce = await this.cacheService.get(this.getAccountNonceKey(address));
    // if (!nonce) {
    // }
    // return parseInt(nonce, 10);
  }

  async markUsed(address: string, nonce: number): Promise<void> {
    await this.cacheService.set(this.getUsedAccountNonceKey(address, nonce), 'true');
  }

  async incrementNonce(address: string): Promise<boolean> {
    return this.cacheService.increment(this.getAccountNonceKey(address), 1);
  }

  private async getAndSetNonceFromNetwork(address: string, pendingCount: boolean): Promise<number> {
    const nonceFromNetwork = await this.networkService.getNonce(address, pendingCount);
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
