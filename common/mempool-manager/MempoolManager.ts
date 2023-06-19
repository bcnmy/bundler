import { BigNumber, BigNumberish, ethers } from 'ethers';
import { MempoolConfigType, MempoolEntry, UserOperationType } from '../types';
import { IMempoolManager } from './interface';
import { MempoolManagerParamsType } from './types';
import { logger } from '../log-config';
import { getCacheMempoolKey } from '../utils';
import { ICacheService } from '../cache';

const log = logger(module);
export class MempoolManager implements IMempoolManager {
  chainId: number;

  entryPoint: ethers.Contract;

  mempoolConfig: MempoolConfigType;

  senderUserOpCount: { [address: string]: number; } = {};

  cacheService: ICacheService;

  mempool: MempoolEntry[];

  mempoolFromCache: MempoolEntry[];

  private eventHandler: ((force: boolean) => void) | null = null;

  nodePathIndex: number;

  constructor(mempoolManagerParams: MempoolManagerParamsType) {
    const {
      cacheService,
      options,
    } = mempoolManagerParams;

    this.cacheService = cacheService;
    this.chainId = options.chainId;
    this.entryPoint = options.entryPoint;
    this.mempoolConfig = options.mempoolConfig;
    this.mempoolFromCache = options.mempoolFromCache !== '' ? JSON.parse(options.mempoolFromCache as string) : [];
    this.mempool = this.mempoolFromCache;
    this.nodePathIndex = options.nodePathIndex;
  }

  markUserOpIncludedForBundling(userOpHash: string): void {
    const index = this.mempool.findIndex((entry) => entry.userOpHash === userOpHash);
    this.mempool[index].markedForBundling = true;
  }

  unmarkUserOpIncludedForBundling(userOpHash: string): void {
    const index = this.mempool.findIndex((entry) => entry.userOpHash === userOpHash);
    this.mempool[index].markedForBundling = false;
  }

  countMempoolEntries(): number {
    return this.mempool.length;
  }

  getMempoolEntries(): MempoolEntry[] {
    // const mempoolEntriesNotMarkedForBundling = this.mempool.filter(
    //   (entry) => entry.markedForBundling === false,
    // );
    // return mempoolEntriesNotMarkedForBundling;
    return this.mempool;
  }

  async addUserOp(userOp: UserOperationType, userOpHash: string) {
    log.info(`New userOp received: ${JSON.stringify(userOp)} with userOpHash: ${userOpHash} entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    const newEntry: MempoolEntry = {
      userOp,
      userOpHash,
      markedForBundling: false,
    };

    const index = this.findUserOpBySenderAndNonce(userOp.sender, userOp.nonce);
    log.info(`index: ${index} for userOp: ${JSON.stringify(userOp)} entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    if (index !== -1) {
      log.info(`UserOp with same sender and nonce already exists in mempool entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
      const oldEntry = this.mempool[index];
      log.info(`old userOp: ${JSON.stringify(oldEntry)} entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
      // Can be old or new userOp
      log.info('Checking if userOp is to be replaced');
      const entry = this.checkAndReplaceUserOpEntry(oldEntry, newEntry);
      this.mempool[index] = entry;
      this.fireUserOpAddedEvent();
      log.info(`Entry pushed in mempool: ${JSON.stringify(this.mempool[index])} entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    } else {
      this.senderUserOpCount[userOp.sender] = (this.senderUserOpCount[userOp.sender] ?? 0) + 1;
      log.info(`Entry pushed in mempool: ${JSON.stringify(newEntry)} entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
      this.mempool.push(newEntry);
      this.fireUserOpAddedEvent();
    }
    this.updateCacheMempool();
  }

  removeUserOp(userOpOrHash: string | UserOperationType): void {
    log.info(`Removing userOpOrHash: ${JSON.stringify(userOpOrHash)} from mempool of length: ${this.mempool.length} of entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    let index = -1;
    if (typeof userOpOrHash === 'string') {
      index = this.mempool.findIndex((entry) => entry.userOpHash === userOpOrHash);
    } else {
      index = this.mempool.findIndex((entry) => entry.userOp === userOpOrHash);
    }
    log.info(`index: ${index} of userOp to be removed from mempool of length: ${this.mempool.length} of entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    this.mempool.splice(index, 1);
    this.updateCacheMempool();
  }

  findUserOpBySenderAndNonce(sender: string, nonce: BigNumberish): number {
    // First check if lock is aquired on the sender and nonce
    // Add the redis lock
    const index = this.mempool.findIndex((entry) => (
      entry.userOp.sender.toLowerCase() === sender.toLowerCase()
      && BigNumber.from(entry.userOp.nonce).toNumber() === nonce
    ));
    return index;
  }

  checkAndReplaceUserOpEntry(
    oldEntry: MempoolEntry,
    newEntry: MempoolEntry,
  ): MempoolEntry {
    const oldMaxPriorityFeePerGas = BigNumber.from(oldEntry.userOp.maxPriorityFeePerGas).toNumber();
    const newMaxPriorityFeePerGas = BigNumber.from(newEntry.userOp.maxPriorityFeePerGas).toNumber();
    const oldMaxFeePerGas = BigNumber.from(oldEntry.userOp.maxFeePerGas).toNumber();
    const newMaxFeePerGas = BigNumber.from(newEntry.userOp.maxFeePerGas).toNumber();
    const {
      minMaxPriorityFeePerGasBumpPercentage,
      minMaxFeePerGasBumpPercentage,
    } = this.mempoolConfig;
    if (
      oldMaxPriorityFeePerGas * (1 + minMaxPriorityFeePerGasBumpPercentage / 100)
      >= newMaxPriorityFeePerGas
    ) {
      return oldEntry;
    }

    if (
      oldMaxFeePerGas * (1 + minMaxFeePerGasBumpPercentage / 100)
      >= newMaxFeePerGas
    ) {
      return oldEntry;
    }
    return newEntry;
  }

  checkSenderUserOpCount(sender: string): number {
    const count = this.mempool.filter(
      (entry) => entry.userOp.sender.toLowerCase() === sender.toLowerCase(),
    ).length;
    return count;
  }

  async updateCacheMempool() {
    this.cacheService.set(
      getCacheMempoolKey(
        this.chainId,
        this.entryPoint.address,
        this.nodePathIndex,
      ),
      JSON.stringify(this.mempool),
    );
  }

  // method to set the event handler
  setEventHandler(handler: (force: boolean) => void) {
    log.info(`Setting eventHandler on mempool with entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    this.eventHandler = handler;
  }

  // method to fire the event
  fireUserOpAddedEvent() {
    log.info(`Firing userOpAddedEvent on mempool with entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
    if (this.eventHandler) {
      // Call the event handler function passing the event data
      log.info(`Calling eventHandler on mempool with entryPointAddress: ${this.entryPoint.address} on chainId: ${this.chainId}`);
      this.eventHandler(false);
    }
  }
}
