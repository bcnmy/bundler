import { Contract } from 'ethers';
import { IBundlerValidationService } from '../simulation/interface';
import { UserOperationType } from '../types';
import { IBundlingService } from './interface';
import { BundlingServiceParamsType } from './types';

export class BundlingService implements IBundlingService {
  chainId: number;

  bundlerValidationService: IBundlerValidationService;

  constructor(bundlingServiceParams: BundlingServiceParamsType) {
    const {
      bundlerValidationService,
      options,
    } = bundlingServiceParams;
    this.chainId = options.chainId;
    this.bundlerValidationService = bundlerValidationService;
  }

  async createBundle(
    userOps: UserOperationType[],
    entryPointContract: Contract,
  ): Promise<UserOperationType[]> {
    console.log(this.chainId);
    console.log(userOps);
    console.log(entryPointContract);
    return userOps;
  }
}
