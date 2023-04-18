import { IEVMAccount } from '../../../relayer/src/services/account';
import { IMempoolManager } from '../../mempool-manager/interface';
import { INetworkService } from '../../network';
import { IBundlerValidationService } from '../../simulation/interface';
import { EVMRawTransactionType } from '../../types';

export type BundlingServiceParamsType = {
  bundlerValidationService: IBundlerValidationService,
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
