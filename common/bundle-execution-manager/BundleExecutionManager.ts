import { IBundlingService } from '../bundling-service/interface';
import { IMempoolManager } from '../mempool-manager/interface';
import { BundlerRelayService } from '../relay-service';
import { IBundleExecutionManager } from './interface/IBundleExecutionManager';
import { BundleExecutionManagerParamsType } from './types';

export class BundleExecutionManager implements IBundleExecutionManager {
  chainId: number;

  autoBundleInterval: number;

  mempoolManagerMap: {
    [chainId: number]: {
      [entryPointAddress: string]: IMempoolManager
    }
  };

  routeTransactionToRelayerMap: {
    [chainId: number]: {
      [transactionType: string]:
      BundlerRelayService
    };
  };

  bundlingService: IBundlingService;

  constructor(bundleExecutionManagerParams: BundleExecutionManagerParamsType) {
    const {
      bundlingService,
      mempoolManagerMap,
      routeTransactionToRelayerMap,
      options,
    } = bundleExecutionManagerParams;
    this.chainId = options.chainId;
    this.autoBundleInterval = options.autoBundleInterval;
    this.bundlingService = bundlingService;
    this.mempoolManagerMap = mempoolManagerMap;
    this.routeTransactionToRelayerMap = routeTransactionToRelayerMap;
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

        // TODO make call to bundling service and send selected userOps

        this.routeTransactionToRelayerMap[this.chainId].BUNDLER
          .sendTransactionToRelayer({
            to: entryPointAddress,
            value: '0x',
            data: '0x',
            gasLimit: '1000000',
            type: 'BUNDLER',
            chainId: this.chainId,
            transactionId: 'random',
            mempoolEntries,
          });
      }
    }
  }
}
