// eslint-disable-next-line import/no-extraneous-dependencies
import NodeCache from 'node-cache';
import { ProviderName } from '../types';
import { IRPCHandler } from './interface';
import { RPCHandlerParamsType } from './types';
import { config } from '../../config';

export class RPCHandler implements IRPCHandler {
  rpcErrorTracker: NodeCache;

  providerNameRegex: {
    [key: string]: RegExp
  } = {};

  providerNameAndWeight: {
    [providerName: string]: number;
  };

  chainId: number;

  constructor(rpcHandlerParams: RPCHandlerParamsType) {
    const {
      options,
    } = rpcHandlerParams;
    this.chainId = options.chainId;
    this.rpcErrorTracker = new NodeCache({ stdTTL: 60 * 15 });

    const providerNameAndWeight = config.chains.providerNameAndWeight[this.chainId];
    this.providerNameAndWeight = providerNameAndWeight;
    for (const [providerName] of Object.entries(providerNameAndWeight)) {
      this.providerNameRegex[providerName] = new RegExp(providerName);
    }
  }

  updateRpcErrorTracker(providerName: ProviderName): void {
    // creating a single cache key on every error
    this.rpcErrorTracker.set(`${providerName}_${Date.now()}`, '1');
  }

  getNextRPCProvider(): ProviderName {
    // start with alchemy as next provider to use
    let nextProvider = ProviderName.ALCHMEY;

    // fetch all keys currently tracked
    const keys = this.rpcErrorTracker.keys();

    // counter to track highest error count
    let highestErrorCountTracker = 0;

    // loop over all the available providers
    // as they are sorted in config by decreasing order
    // provider with higher weight will be checked first always
    for (const [providerName] of Object.entries(this.providerNameAndWeight)) {
      const providerErrorCountKeys = [];
      for (const errorTrackerKey of keys) {
        if (this.providerNameRegex[providerName].test(errorTrackerKey)) {
          // keep pushing the keys if they match regex of the provider name
          providerErrorCountKeys.push(errorTrackerKey);
        }
      }
      // length of array would be number of errors at any given time
      const currentProviderErrorCount = providerErrorCountKeys.length;

      // if any provider has 0 error count that should be used
      if (currentProviderErrorCount === 0) {
        nextProvider = providerName as ProviderName;
        break;
      }

      // if current provider has lower error count than previous iteration
      // use current iteration provider
      if (currentProviderErrorCount < highestErrorCountTracker) {
        nextProvider = providerName as ProviderName;
        break;
      }

      // if current provider has a higher error count that previous error count
      // set this as highest error count tracker
      if (currentProviderErrorCount > highestErrorCountTracker) {
        highestErrorCountTracker = currentProviderErrorCount;
      }
    }

    return nextProvider;
  }
}
