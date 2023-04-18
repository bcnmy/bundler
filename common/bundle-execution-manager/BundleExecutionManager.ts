import { IBundlingService } from '../bundling-service/interface';
import { routeTransactionToRelayerMap } from '../service-manager';
import { MempoolManagerMapTye, TransactionType } from '../types';
import { generateTransactionId } from '../utils';
import { IBundleExecutionManager } from './interface/IBundleExecutionManager';
import { BundleExecutionManagerParamsType } from './types';

export class BundleExecutionManager implements IBundleExecutionManager {
  chainId: number;

  autoBundleInterval: number;

  mempoolManagerMap: MempoolManagerMapTye;

  bundlingService: IBundlingService;

  constructor(bundleExecutionManagerParams: BundleExecutionManagerParamsType) {
    const {
      mempoolManagerMap,
      bundlingService,
      options,
    } = bundleExecutionManagerParams;
    this.chainId = options.chainId;
    this.autoBundleInterval = options.autoBundleInterval;
    this.bundlingService = bundlingService;
    this.mempoolManagerMap = mempoolManagerMap;
  }

  async initAutoBundling(): Promise<void> {
    setInterval(() => {
      this.attemptBundle(true);
    }, this.autoBundleInterval * 1000);
  }

  async attemptBundle(force: boolean = true): Promise<void> {
    const mempoolManagerForCurrentChainId = this.mempoolManagerMap[this.chainId];

    for (const entryPointAddress of Object.keys(mempoolManagerForCurrentChainId)) {
      const mempoolManager = mempoolManagerForCurrentChainId[entryPointAddress];
      if (
        force
        || mempoolManager.countMempoolEntries() >= mempoolManager.mempoolConfig.maxLength
      ) {
        const mempoolEntries = mempoolManager.getMempoolEntries();
        const transactionId = generateTransactionId((Date.now()).toString());

        // TODO make call to bundling service and send selected userOps

        routeTransactionToRelayerMap[this.chainId][TransactionType.BUNDLER]
          .sendTransactionToRelayer({
            to: entryPointAddress,
            value: '0x',
            data: '0x',
            gasLimit: '1000000',
            type: TransactionType.BUNDLER,
            chainId: this.chainId,
            transactionId,
            mempoolEntries,
          });
      }
    }
  }
}
