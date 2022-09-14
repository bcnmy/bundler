import { Network } from 'network-sdk';
import { ICacheService } from '../../../../common/cache';
import { INonceManager } from './interface/INonceManager';

export class NonceManager implements INonceManager {
  chainId: number;

  networkService: Network;

  cacheService: ICacheService;

  constructor(chainId: number, network: Network, cacheService: ICacheService) {
    this.chainId = chainId;
    this.networkService = network;
    this.cacheService = cacheService;
  }

  async getNonce(address: string): Promise<number> {
    const nonce = await this.cacheService.get(this.getAccountNonceKey(address));
    if (!nonce) {
      return this.getAndSetNonceFromNetwork(address);
    }
    return parseInt(nonce, 10);
  }

  async markUsed(address: string, nonce: number): Promise<void> {
    await this.cacheService.set(this.getUsedAccountNonceKey(address, nonce), 'true');
  }

  async incrementNonce(address: string): Promise<boolean> {
    return this.cacheService.increment(this.getAccountNonceKey(address), 1);
  }

  private async getAndSetNonceFromNetwork(address: string): Promise<number> {
    const nonceFromNetwork = await this.networkService.getNonce(address);
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
