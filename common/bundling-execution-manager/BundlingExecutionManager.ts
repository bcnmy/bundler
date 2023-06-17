/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
import { Mutex } from 'async-mutex';
import { logger } from '../../server/dist/common/log-config';
import { IBundlingService } from '../bundling-service/interface';
import { IMempoolManager } from '../mempool-manager/interface';
import { BundlerRelayService } from '../relay-service';
import { IUserOpValidationAndGasEstimationService } from '../simulation/interface';
import { EntryPointMapType, TransactionType, UserOperationType } from '../types';
import { generateTransactionId, parseError } from '../utils';
import { IBundlingExecutionManager } from './interface/IBundlingExecutionManager';
import { BundleExecutionManagerParamsType } from './types';

const log = logger(module);

const bundlingExecutionMutex = new Mutex();

export class BundlingExecutionManager implements IBundlingExecutionManager {
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

  userOpValidationAndGasEstimationService: IUserOpValidationAndGasEstimationService;

  entryPointMap: EntryPointMapType;

  bundlingService: IBundlingService;

  constructor(bundleExecutionManagerParams: BundleExecutionManagerParamsType) {
    const {
      bundlingService,
      mempoolManager,
      routeTransactionToRelayerMap,
      userOpValidationAndGasEstimationService,
      entryPointMap,
      options,
    } = bundleExecutionManagerParams;
    this.chainId = options.chainId;
    this.autoBundlingInterval = options.autoBundlingInterval;
    this.bundlingService = bundlingService;
    this.mempoolManager = mempoolManager;
    this.routeTransactionToRelayerMap = routeTransactionToRelayerMap;
    this.userOpValidationAndGasEstimationService = userOpValidationAndGasEstimationService;
    this.entryPointMap = entryPointMap;
    for (const entryPointAddress of Object.keys(this.mempoolManager)) {
      log.info(`Setting event handler of mempoolManager for entryPointAddress: ${entryPointAddress} on chainId: ${this.chainId}`);
      this.mempoolManager[entryPointAddress].setEventHandler(this.attemptBundle.bind(this));
    }
  }

  async initAutoBundling(): Promise<void> {
    log.info(`Auto bundling started on chainId: ${this.chainId} with autoBundlingInterval: ${this.autoBundlingInterval} seconds`);
    // TODO For later it returns an id and it
    // should be able to dynamically update autoBundleInterval
    setInterval(() => {
      log.info(`Attempting to bundle on chainId: ${this.chainId}`);
      this.attemptBundle(true);
    }, this.autoBundlingInterval * 1000);
  }

  async attemptBundle(force: boolean = false): Promise<void> {
    try {
      for (const entryPointAddress of Object.keys(this.mempoolManager)) {
        try {
          log.info(`Attempting to bundle for mempool of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
          bundlingExecutionMutex.runExclusive(async () => {
            const mempoolManager = this.mempoolManager[entryPointAddress];
            if (
              force
              || mempoolManager.countMempoolEntries() >= mempoolManager.mempoolConfig.maxLength
            ) {
              log.info(`Getting mempool entries for mempool of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
              const mempoolEntries = mempoolManager.getMempoolEntries();
              log.info(`Mempool entries are: ${JSON.stringify(mempoolEntries)} of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);

              if (mempoolEntries.length === 0) {
                log.info(`No entries in mempool to bundle of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
                return;
              }

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
              log.info(`UserOps that are ready to be bundled: ${JSON.stringify(userOps)} of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);

              if (userOps.length === 0) {
                log.info(`No userOps to be bundled of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
                return;
              }
              log.info(`Simulating handleOps for: ${JSON.stringify(userOps)} of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
              const gasLimitForHandleOps = await this.userOpValidationAndGasEstimationService
                .estimateHandleOps({
                  userOps,
                  entryPointContract,
                });
              log.info(`gasLimitForHandleOps: ${gasLimitForHandleOps} of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);

              const transactionId = generateTransactionId(JSON.stringify(userOps));
              log.info(`transactionId: ${transactionId} of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);

              this.routeTransactionToRelayerMap[this.chainId].BUNDLER
                .sendTransactionToRelayer({
                  to: entryPointAddress,
                  value: '0x0',
                  data: '0x', // will be updated on consumer side
                  gasLimit: gasLimitForHandleOps.toString(),
                  type: TransactionType.BUNDLER,
                  chainId: this.chainId,
                  transactionId,
                  userOps,
                });
            }
          });
        } catch (error) {
          log.error(`Error: ${parseError(error)} in bundling userOps for mempool of entryPoint: ${entryPointAddress} on chainId: ${this.chainId}`);
        }
      }
    } catch (error) {
      log.error(`Error: ${parseError(error)} in bundling on chainId: ${this.chainId}`);
    }
  }
}
