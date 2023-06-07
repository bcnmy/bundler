import { IBundlingService } from '../../bundling-service/interface';
import { IMempoolManager } from '../../mempool-manager/interface';
import { BundlerRelayService } from '../../relay-service';
import { UserOpValidationService } from '../../simulation';
import { EntryPointMapType } from '../../types';

export interface IBundlingExecutionManager {
  chainId: number;
  autoBundlingInterval: number;
  mempoolManager: {
    [entryPointAddress: string]: IMempoolManager
  };
  routeTransactionToRelayerMap: {
    [chainId: number]: {
      [transactionType: string]:
      BundlerRelayService
    };
  };

  userOpValidationService: UserOpValidationService;

  entryPointMap: EntryPointMapType;

  bundlingService: IBundlingService;

  attemptBundle(force: boolean): Promise<void>
}
