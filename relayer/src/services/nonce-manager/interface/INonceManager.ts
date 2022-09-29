import { ICacheService } from '../../../../../common/cache';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';

export interface INonceManager {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  cacheService: ICacheService;

  getNonce(address: string): Promise<number>;
  markUsed(address: string, nonce: number): Promise<void>;
  incrementNonce(address: string): Promise<boolean>;
}
