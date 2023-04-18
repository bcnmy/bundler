import { IBundlerValidationService } from '../../simulation/interface';

export type BundlingServiceParamsType = {
  bundlerValidationService: IBundlerValidationService,
  options: {
    chainId: number
  },
};
