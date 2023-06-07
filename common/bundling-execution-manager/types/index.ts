import { IBundlingService } from '../../bundling-service/interface';
import { IMempoolManager } from '../../mempool-manager/interface';
import { BundlerRelayService } from '../../relay-service';
import { UserOpValidationService } from '../../simulation';
import { EntryPointMapType } from '../../types';

export type BundleExecutionManagerParamsType = {
  bundlingService: IBundlingService,
  mempoolManager: {
    [entryPointAddress: string]: IMempoolManager
  }
  routeTransactionToRelayerMap: {
    [chainId: number]: {
      [transactionType: string]:
      BundlerRelayService
    };
  }
  entryPointMap: EntryPointMapType
  userOpValidationService: UserOpValidationService
  options: {
    chainId: number,
    autoBundlingInterval: number
  },
};
