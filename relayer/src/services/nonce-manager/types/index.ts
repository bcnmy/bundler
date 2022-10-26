import { ICacheService } from '../../../../../common/cache';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount } from '../../account';

export type EVMNonceManagerParamsType = {
  options: {
    chainId: number;
  },
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;
  cacheService: ICacheService;
};
