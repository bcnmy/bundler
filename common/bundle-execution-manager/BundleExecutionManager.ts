import { IBundlingService } from '../bundling-service/interface';
import { IMempoolManager } from '../mempool-manager/interface';
import { BundlerRelayService } from '../relay-service';
import { EntryPointMapType, UserOperationType } from '../types';
import { IBundleExecutionManager } from './interface/IBundleExecutionManager';
import { BundleExecutionManagerParamsType } from './types';

export class BundleExecutionManager implements IBundleExecutionManager {
  chainId: number;

  autoBundleInterval: number;

  mempoolManagerMap: {
    [entryPointAddress: string]: IMempoolManager
  };

  routeTransactionToRelayerMap: {
    [chainId: number]: {
      [transactionType: string]:
      BundlerRelayService
    };
  };

  entryPointMap: EntryPointMapType = {};

  bundlingService: IBundlingService;

  constructor(bundleExecutionManagerParams: BundleExecutionManagerParamsType) {
    const {
      bundlingService,
      mempoolManagerMap,
      routeTransactionToRelayerMap,
      entryPointMap,
      options,
    } = bundleExecutionManagerParams;
    this.chainId = options.chainId;
    this.autoBundleInterval = options.autoBundleInterval;
    this.bundlingService = bundlingService;
    this.mempoolManagerMap = mempoolManagerMap;
    this.routeTransactionToRelayerMap = routeTransactionToRelayerMap;
    this.entryPointMap = entryPointMap;
  }

  async initAutoBundling(): Promise<void> {
    setInterval(() => {
      this.attemptBundle(true);
    }, this.autoBundleInterval * 1000);
  }

  async attemptBundle(force: boolean = true): Promise<void> {
    for (const entryPointAddress of Object.keys(this.mempoolManagerMap)) {
      const mempoolManager = this.mempoolManagerMap[entryPointAddress];
      if (
        force
        || mempoolManager.countMempoolEntries() >= mempoolManager.mempoolConfig.maxLength
      ) {
        const mempoolEntries = mempoolManager.getMempoolEntries();

        const userOpsFromMempool: UserOperationType[] = [];
        for (let mempoolIndex = 0; mempoolIndex < mempoolEntries.length; mempoolIndex += 1) {
          userOpsFromMempool.push(mempoolEntries[mempoolIndex].userOp);
        }

        const entryPointContracts = this.entryPointMap[this.chainId];
        let entryPointContract;
        for (let entryPointContractIndex = 0;
          entryPointContractIndex < entryPointContracts.length;
          entryPointContractIndex += 1) {
          if (entryPointContracts[entryPointContractIndex].address.toLowerCase()
           === entryPointAddress.toLowerCase()) {
            entryPointContract = entryPointContracts[entryPointContractIndex].entryPointContract;
            break;
          }
        }

        if (!entryPointContract) {
          return;
        }

        this.bundlingService.createBundle(userOpsFromMempool, entryPointContract);

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
