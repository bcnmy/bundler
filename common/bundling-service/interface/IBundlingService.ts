import { ethers } from 'ethers';
import { IUserOpValidationService } from '../../simulation/interface';
import { EVMRawTransactionType, UserOperationType } from '../../types';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { IMempoolManager } from '../../mempool-manager/interface';
import { INetworkService } from '../../network';
import { SortUserOpsByFeeAndGas } from '../sorting-algorithm';

export interface IBundlingService {
  chainId: number;
  userOpValidationService: IUserOpValidationService;
  mempoolManager: {
    [entryPointAddress: string]: IMempoolManager
  };
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  sortingStrategy: SortUserOpsByFeeAndGas;
  maxBundleGas: number;
  createBundle(
    userOps: UserOperationType[],
    entryPointContract: ethers.Contract
  ): Promise<UserOperationType[]>
}
