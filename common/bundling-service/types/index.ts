import { IEVMAccount } from '../../../relayer/src/services/account';
import { IMempoolManager } from '../../mempool-manager/interface';
import { INetworkService } from '../../network';
import { IUserOpValidationAndGasEstimationService } from '../../simulation/interface';
import { EVMRawTransactionType } from '../../types';

export type BundlingServiceParamsType = {
  userOpValidationAndGasEstimationService: IUserOpValidationAndGasEstimationService,
  mempoolManager: {
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
