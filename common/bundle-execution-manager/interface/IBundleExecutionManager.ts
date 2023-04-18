import { IMempoolManager } from '../../mempool-manager/interface';

export interface IBundleExecutionManager {
  chainId: number;
  autoBundleInterval: number;
  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  };

  initAutoBundling(): Promise<void>
  attemptBundle(force: boolean): Promise<void>
}
