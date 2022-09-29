import { ICacheService } from '../../../../../common/cache';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';

export type EVMNonceManagerParamsType = {
  options: {
    chainId: number;
  },
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  cacheService: ICacheService;
};
