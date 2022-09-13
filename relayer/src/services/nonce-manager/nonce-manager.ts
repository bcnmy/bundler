import { Network } from 'network-sdk';
import { INonceManager } from './interface';

export class NonceManager implements INonceManager {
  chainId: number;

  networkService: Network;

  cacheService: ICacheService;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.networkService = network;
  }

  getNonce(address: string): Promise<number> {
  }

  markUsed(address: string, nonce: number): Promise<void> {
  }

  incrementNonce(address: string): Promise<number> {
  }

  private getAndSetNonceFromNetwork(address, accountNonceKey) {

  }

  private getAccountNonceKey(address, nonce) {
    
  }
}
