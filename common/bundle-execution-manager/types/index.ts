import { IBundlingService } from '../../bundling-service/interface';
import { IMempoolManager } from '../../mempool-manager/interface';
import { BundlerRelayService } from '../../relay-service';
import { EntryPointMapType } from '../../types';

export type BundleExecutionManagerParamsType = {
  bundlingService: IBundlingService,
  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  }
  routeTransactionToRelayerMap: {
    [chainId: number]: {
      [transactionType: string]:
      BundlerRelayService
    };
  }
  entryPointMap: EntryPointMapType
  options: {
    chainId: number,
    autoBundleInterval: number
  },
};
