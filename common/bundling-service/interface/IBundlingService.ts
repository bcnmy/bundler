import { ethers } from 'ethers';
import { IBundlerValidationService } from '../../simulation/interface';
import { UserOperationType } from '../../types';

export interface IBundlingService {
  chainId: number;
  bundlerValidationService: IBundlerValidationService
  createBundle(
    userOps: UserOperationType[],
    entryPointContract: ethers.Contract
  ): Promise<UserOperationType[]>
}
