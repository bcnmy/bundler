/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import { BigNumber, Contract } from 'ethers';
import { IBundlerValidationService } from '../simulation/interface';
import { EVMRawTransactionType, UserOperationType } from '../types';
import { IBundlingService } from './interface';
import { BundlingServiceParamsType } from './types';
import { INetworkService } from '../network';
import { IEVMAccount } from '../../relayer/src/services/account';
import { SortUserOpsByFeeAndGas } from './sorting-algorithm';
import { IMempoolManager } from '../mempool-manager/interface';

export class BundlingService implements IBundlingService {
  chainId: number;

  bundlerValidationService: IBundlerValidationService;

  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  };

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  sortingStrategy: SortUserOpsByFeeAndGas;

  maxBundleGas: number;

  constructor(bundlingServiceParams: BundlingServiceParamsType) {
    const {
      bundlerValidationService,
      mempoolManagerMap,
      networkService,
      options,
    } = bundlingServiceParams;
    this.chainId = options.chainId;
    this.maxBundleGas = options.maxBundleGas;
    this.mempoolManagerMap = mempoolManagerMap;
    this.bundlerValidationService = bundlerValidationService;
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
      const validationResult = await this.bundlerValidationService.validateUserOperation({
        userOp,
        entryPointContract,
        chainId: this.chainId,
      });

      if (!validationResult.isValidationSuccessful) {
        this.mempoolManagerMap[entryPointContract.address].removeUserOp(userOp);
        continue;
      }
      const userOpGasCost = BigNumber.from(
        validationResult.data.entityInfo?.returnInfo.preOpGas,
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
