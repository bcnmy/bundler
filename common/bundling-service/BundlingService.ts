/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import { BigNumber, Contract } from 'ethers';
import { IUserOpValidationAndGasEstimationService } from '../simulation/interface';
import { EVMRawTransactionType, UserOperationType } from '../types';
import { IBundlingService } from './interface';
import { BundlingServiceParamsType } from './types';
import { INetworkService } from '../network';
import { IEVMAccount } from '../../relayer/src/services/account';
import { SortUserOpsByFeeAndGas } from './sorting-algorithm';
import { IMempoolManager } from '../mempool-manager/interface';
import { SimulateValidationReturnType } from '../simulation/types';
import { logger } from '../log-config';
import { parseError } from '../utils';

const log = logger(module);
export class BundlingService implements IBundlingService {
  chainId: number;

  userOpValidationAndGasEstimationService: IUserOpValidationAndGasEstimationService;

  mempoolManager: {
    [entryPointAddress: string]: IMempoolManager
  };

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  sortingStrategy: SortUserOpsByFeeAndGas;

  maxBundleGas: number;

  constructor(bundlingServiceParams: BundlingServiceParamsType) {
    const {
      userOpValidationAndGasEstimationService,
      mempoolManager,
      networkService,
      options,
    } = bundlingServiceParams;
    this.chainId = options.chainId;
    this.maxBundleGas = options.maxBundleGas;
    this.mempoolManager = mempoolManager;
    this.userOpValidationAndGasEstimationService = userOpValidationAndGasEstimationService;
    this.networkService = networkService;

    const sortUserOpsByFeeAndGas = new SortUserOpsByFeeAndGas();

    this.sortingStrategy = sortUserOpsByFeeAndGas;
  }

  async createBundle(
    userOps: UserOperationType[],
    entryPointContract: Contract,
  ): Promise<UserOperationType[]> {
    const sortedUserOps = this.sortUserOps(userOps);
    log.info(`Sorted userOps: ${JSON.stringify(sortedUserOps)} for entryPoint: ${entryPointContract.address}`);
    const bundle: UserOperationType[] = [];
    const senders = new Set<string>();
    let totalGas = BigNumber.from(0);

    for (const userOp of sortedUserOps) {
      log.info(`Checking if sender: ${userOp.sender} already exists in bundle`);
      if (senders.has(userOp.sender.toLowerCase())) {
        log.info(`The sender: ${userOp.sender} of userOp: ${JSON.stringify(userOp)} already has a userOp in the bundle`);
        continue;
      }

      log.info(`Validating userOp: ${JSON.stringify(userOp)} before putting in bundle`);
      let validationResult: SimulateValidationReturnType;

      try {
        validationResult = await this.userOpValidationAndGasEstimationService.simulateValidation({
          userOp,
          entryPointContract,
        });
        log.info(`validationResult: ${JSON.stringify(validationResult)} for userOp: ${JSON.stringify(userOp)}`);
      } catch (error) {
        log.info(`Error in validation: ${parseError(error)} for userOp: ${JSON.stringify(userOp)} hence not bundling and removing from mempool`);
        this.mempoolManager[entryPointContract.address].removeUserOp(userOp);
        continue;
      }

      const userOpGasCost = BigNumber.from(
        validationResult.returnInfo.preOpGas,
      ).add(userOp.callGasLimit);
      log.info(`userOpGasCost: ${userOpGasCost} for userOp: ${JSON.stringify(userOp)}`);
      totalGas = totalGas.add(userOpGasCost);
      if (totalGas.gt(this.maxBundleGas)) {
        break;
      }
      log.info(`totalGas: ${totalGas} for userOp: ${JSON.stringify(userOp)}`);
      // const mempoolEntry = this.mempoolManager[entryPointContract.address].mempool.find(
      //   (entry) => entry.userOp === userOp,
      // ) as MempoolEntry;
      // mempoolEntry.markedForBundling = true;
      // Removing userOps from mempool
      // Ideally they should be removed once the transaction has either been mined
      // Currently feeling it gets complex to do this on transaction side
      // Either or, whatever goes in the bundle will be executed
      // Advantage of doing on transaction side is to update reputation of entities
      // Reputation thing we are not doing so keeping things simple for now
      this.mempoolManager[entryPointContract.address].removeUserOp(userOp);
      this.mempoolManager[entryPointContract.address].updateCacheMempool();
      senders.add(userOp.sender.toLowerCase());
      bundle.push(userOp);
      log.info(`userOp: ${JSON.stringify(userOp)} pushed in bundle`);
    }
    log.info(`bundle length: ${bundle.length} for userOps: ${JSON.stringify(userOps)} and entryPoint: ${entryPointContract.address}`);
    log.info(`bundle: ${JSON.stringify(bundle)} for userOps: ${JSON.stringify(userOps)} and entryPoint: ${entryPointContract.address}`);
    return bundle;
  }

  private sortUserOps(userOps: UserOperationType[]): UserOperationType[] {
    const sortedUserOps = this.sortingStrategy.sort(userOps);
    return sortedUserOps;
  }
}
