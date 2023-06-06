/* eslint-disable no-await-in-loop */
import { IBundlingService } from '../bundling-service/interface';
import { IMempoolManager } from '../mempool-manager/interface';
import { BundlerRelayService } from '../relay-service';
import { UserOpValidationService } from '../simulation';
import { EntryPointMapType, TransactionType, UserOperationType } from '../types';
import { generateTransactionId } from '../utils';
import { IBundlingExecutionManager } from './interface/IBundlingExecutionManager';
import { BundleExecutionManagerParamsType } from './types';

export class BundlingExecutionManager implements IBundlingExecutionManager {
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

  userOpValidationService: UserOpValidationService;

  entryPointMap: EntryPointMapType = {};

  bundlingService: IBundlingService;

  constructor(bundleExecutionManagerParams: BundleExecutionManagerParamsType) {
    const {
      bundlingService,
      mempoolManagerMap,
      routeTransactionToRelayerMap,
      userOpValidationService,
      entryPointMap,
      options,
    } = bundleExecutionManagerParams;
    this.chainId = options.chainId;
    this.autoBundleInterval = options.autoBundleInterval;
    this.bundlingService = bundlingService;
    this.mempoolManagerMap = mempoolManagerMap;
    this.routeTransactionToRelayerMap = routeTransactionToRelayerMap;
    this.userOpValidationService = userOpValidationService;
    this.entryPointMap = entryPointMap;
  }

  async initAutoBundling(): Promise<void> {
    setInterval(() => {
      this.attemptBundle(true);
    }, this.autoBundleInterval * 1000);
  }

  async attemptBundle(force: boolean = false): Promise<void> {
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

        const entryPointContract = this.entryPointMap[this.chainId][entryPointAddress];

        if (!entryPointContract) {
          return;
        }

        const userOps = await this.bundlingService.createBundle(
          userOpsFromMempool,
          entryPointContract,
        );

        const gasLimitForHandleOps = await this.userOpValidationService.simulateHandleOps({
          userOps,
          entryPointContract,
        });

        const transactionId = generateTransactionId(JSON.stringify(userOps));

        this.routeTransactionToRelayerMap[this.chainId].BUNDLER
          .sendTransactionToRelayer({
            to: entryPointAddress,
            value: '0x',
            data: '0x', // will be updated on consumer side
            gasLimit: gasLimitForHandleOps,
            type: TransactionType.BUNDLER,
            chainId: this.chainId,
            transactionId,
            userOps,
          });
      }
    }
  }
}
