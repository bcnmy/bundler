/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import { BigNumber, Contract } from 'ethers';
import { IUserOpValidationService } from '../simulation/interface';
import { EVMRawTransactionType, UserOperationType } from '../types';
import { IBundlingService } from './interface';
import { BundlingServiceParamsType } from './types';
import { INetworkService } from '../network';
import { IEVMAccount } from '../../relayer/src/services/account';
import { SortUserOpsByFeeAndGas } from './sorting-algorithm';
import { IMempoolManager } from '../mempool-manager/interface';
import { SimulateValidationReturnType } from '../simulation/types';

export class BundlingService implements IBundlingService {
  chainId: number;

  userOpValidationService: IUserOpValidationService;

  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  };

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  sortingStrategy: SortUserOpsByFeeAndGas;

  maxBundleGas: number;

  constructor(bundlingServiceParams: BundlingServiceParamsType) {
    const {
      userOpValidationService,
      mempoolManagerMap,
      networkService,
      options,
    } = bundlingServiceParams;
    this.chainId = options.chainId;
    this.maxBundleGas = options.maxBundleGas;
    this.mempoolManagerMap = mempoolManagerMap;
    this.userOpValidationService = userOpValidationService;
    this.networkService = networkService;

    const sortUserOpsByFeeAndGas = new SortUserOpsByFeeAndGas({
      networkService,
    });

    this.sortingStrategy = sortUserOpsByFeeAndGas;
  }

  async createBundle(
    userOps: UserOperationType[],
    entryPointContract: Contract,
  ): Promise<UserOperationType[]> {
    const sortedUserOps = await this.sortUserOps(userOps);
    const bundle: UserOperationType[] = [];
    const senders = new Set<string>();
    let totalGas = BigNumber.from(0);

    for (const userOp of sortedUserOps) {
      let validationResult: SimulateValidationReturnType;

      try {
        validationResult = await this.userOpValidationService.simulateValidation({
          userOp,
          entryPointContract,
        });
      } catch (error) {
        this.mempoolManagerMap[entryPointContract.address].removeUserOp(userOp);
        continue;
      }

      const userOpGasCost = BigNumber.from(
        validationResult.returnInfo.preOpGas,
      ).add(userOp.callGasLimit);
      const newTotalGas = totalGas.add(userOpGasCost);
      if (newTotalGas.gt(this.maxBundleGas)) {
        break;
      }
      senders.add(userOp.sender);
      bundle.push(userOp);
      totalGas = newTotalGas;
    }
    return bundle;
  }

  private async sortUserOps(userOps: UserOperationType[]): Promise<UserOperationType[]> {
    const sortedUserOps = await this.sortingStrategy.sort(userOps);
    return sortedUserOps;
  }
}
