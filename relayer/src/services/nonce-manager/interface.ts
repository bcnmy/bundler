import { Network } from 'network-sdk';

export interface INonceManager {
  chainId: number;
  networkService: Network;
  cacheService: ICacheService;

  getNonce(address: string): Promise<number>;
  markUsed(address: string, nonce: number): Promise<void>;
  incrementNonce(address: string): Promise<number>;
}
