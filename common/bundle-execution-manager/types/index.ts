import { IBundlingService } from '../../bundling-service/interface';
import { MempoolManagerMapTye } from '../../types';

export type BundleExecutionManagerParamsType = {
  mempoolManagerMap: MempoolManagerMapTye,
  bundlingService: IBundlingService,
  options: {
    chainId: number,
    autoBundleInterval: number
  },
};
