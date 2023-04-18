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

  createBundle(
    userOps: UserOperationType[],
    entryPointContract: Contract,
  ): Promise<UserOperationType[]> {
    throw new Error('Method not implemented.');
  }
}
