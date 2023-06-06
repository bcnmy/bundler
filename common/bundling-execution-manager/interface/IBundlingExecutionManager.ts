import { IMempoolManager } from '../../mempool-manager/interface';

export interface IBundlingExecutionManager {
  chainId: number;
  autoBundleInterval: number;
  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  };

  attemptBundle(force: boolean): Promise<void>
}
