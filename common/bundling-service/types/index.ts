import { IEVMAccount } from '../../../relayer/src/services/account';
import { IMempoolManager } from '../../mempool-manager/interface';
import { INetworkService } from '../../network';
import { IUserOpValidationService } from '../../simulation/interface';
import { EVMRawTransactionType } from '../../types';

export type BundlingServiceParamsType = {
  userOpValidationService: IUserOpValidationService,
  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  },
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>
  options: {
    chainId: number,
    maxBundleGas: number,
  },
};

export type SortUserOpsByFeeAndGasParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>
};
