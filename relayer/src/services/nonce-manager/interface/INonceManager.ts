import { Network } from 'network-sdk';
import { ICacheService } from '../../../../../common/cache';

// REVIEW
// If we add <AccountType> where to use it? Should all functions
// take an account instead of an address?

export interface INonceManager {
  chainId: number;
  networkService: Network;
  cacheService: ICacheService;

  getNonce(address: string): Promise<number>;
  markUsed(address: string, nonce: number): Promise<void>;
  incrementNonce(address: string): Promise<boolean>;
}
