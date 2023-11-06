/* eslint-disable import/no-import-module-exports */
// eslint-disable-next-line import/no-extraneous-dependencies
import NodeCache from 'node-cache';
import { ProviderName, ProviderNameWeightAndRPCUrlType } from '../types';
import { IRPCHandler } from './interface';
import { RPCHandlerParamsType } from './types';
import { config } from '../../config';
import { logger } from '../logger';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });

export class RPCHandler implements IRPCHandler {
  rpcErrorTracker: NodeCache;

  providerNameRegex: {
    [key: string]: RegExp
  } = {};

  providerNameWeightAndRPCUrl: ProviderNameWeightAndRPCUrlType;

  currentProviderName: string;

  chainId: number;

  constructor(rpcHandlerParams: RPCHandlerParamsType) {
    const {
      options,
    } = rpcHandlerParams;
    this.chainId = options.chainId;
    this.rpcErrorTracker = new NodeCache({ stdTTL: 60 * 15 });

    this.providerNameWeightAndRPCUrl = config.chains.providerNameWeightAndRPCUrl[this.chainId];
    for (const [providerName] of Object.entries(this.providerNameWeightAndRPCUrl)) {
      this.providerNameRegex[providerName] = new RegExp(providerName);
    }
    // eslint-disable-next-line prefer-destructuring
    this.currentProviderName = Object.keys(this.providerNameWeightAndRPCUrl)[0];
    log.info(`currentProviderName: ${this.currentProviderName} on chainId: ${this.chainId}`);
  }

  updateRpcErrorTracker(providerName: ProviderName): void {
    // creating a single cache key on every error
    log.info(`Updating RPC error tracker for providerName: ${providerName} on chainId: ${this.chainId}`);
    this.rpcErrorTracker.set(`${providerName}_${Date.now()}`, '1');
  }

  getNextRPCProvider(): ProviderName {
    // start with alchemy as next provider to use
    let nextProvider = ProviderName.ALCHMEY;

    // fetch all keys currently tracked
    const keys = this.rpcErrorTracker.keys();
    log.info(`${keys.length} RPC errors on chainId: ${this.chainId}`);

    // counter to track highest error count
    let highestErrorCountTracker = 0;

    // loop over all the available providers
    // as they are sorted in config by decreasing order
    // provider with higher weight will be checked first always
    for (const [providerName] of Object.entries(this.providerNameWeightAndRPCUrl)) {
      log.info(`Checking RPC error count for providerName: ${providerName} on chainId: ${this.chainId}`);
      const providerErrorCountKeys = [];
      for (const errorTrackerKey of keys) {
        if (this.providerNameRegex[providerName].test(errorTrackerKey)) {
          // keep pushing the keys if they match regex of the provider name
          providerErrorCountKeys.push(errorTrackerKey);
        }
      }
      // length of array would be number of errors at any given time
      const currentProviderErrorCount = providerErrorCountKeys.length;
      log.info(`${currentProviderErrorCount} RPC errors for providerName: ${providerName} on chainId: ${this.chainId}`);

      // if any provider has 0 error count that should be used
      if (currentProviderErrorCount === 0) {
        log.info(`currentProviderErrorCount is 0 for providerName: ${providerName} on chainId: ${this.chainId}`);
        nextProvider = providerName as ProviderName;
        break;
      }

      // if current provider has lower error count than previous iteration
      // use current iteration provider
      if (currentProviderErrorCount < highestErrorCountTracker) {
        log.info(`currentProviderErrorCount is lower than the highestErrorCountTracker for providerName: ${providerName} on chainId: ${this.chainId}`);
        nextProvider = providerName as ProviderName;
        break;
      }

      // if current provider has a higher error count that previous error count
      // set this as highest error count tracker
      if (currentProviderErrorCount > highestErrorCountTracker) {
        log.info(`currentProviderErrorCount is higher than the highestErrorCountTracker for providerName: ${providerName} on chainId: ${this.chainId}`);
        highestErrorCountTracker = currentProviderErrorCount;
      }
    }
    log.info(`Updating currentProviderName to ${nextProvider} on chainId: ${this.chainId}`);
    this.currentProviderName = nextProvider;
    return nextProvider;
  }
}
