import { MempoolManagerMapTye } from '../../types';

export interface IBundleExecutionManager {
  chainId: number;
  autoBundleInterval: number;
  mempoolManagerMap: MempoolManagerMapTye;

  initAutoBundling(): Promise<void>
  attemptBundle(force: boolean): Promise<void>
}
