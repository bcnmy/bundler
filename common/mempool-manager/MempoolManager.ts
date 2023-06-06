import { BigNumber, BigNumberish, ethers } from 'ethers';
import { MempoolConfigType, MempoolEntry, UserOperationType } from '../types';
import { IMempoolManager } from './interface';
import { MempoolManagerParamsType } from './types';

export class MempoolManager implements IMempoolManager {
  chainId: number;

  entryPoint: ethers.Contract;

  mempoolConfig: MempoolConfigType;

  senderUserOpCount: { [address: string]: number; } = {};

  // TODO CHange it to cache so that even on server restart the mempool can persist
  private mempool: MempoolEntry[] = [];

  constructor(mempoolManagerParams: MempoolManagerParamsType) {
    const {
      options,
    } = mempoolManagerParams;

    this.chainId = options.chainId;
    this.entryPoint = options.entryPoint;
    this.mempoolConfig = options.mempoolConfig;
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
    return this.mempool;
  }

  async addUserOp(userOp: UserOperationType, userOpHash: string) {
    const newEntry: MempoolEntry = {
      userOp,
      userOpHash,
      markedForBundling: false,
    };
    const index = this.findUserOpBySenderAndNonce(userOp.sender, userOp.nonce);
    if (index !== -1) {
      const oldEntry = this.mempool[index];
      // Can be old or new userOp
      this.mempool[index] = this.checkAndReplaceUserOpEntry(oldEntry, newEntry);
    } else {
      this.senderUserOpCount[userOp.sender] = (this.senderUserOpCount[userOp.sender] ?? 0) + 1;
      // TODO add this we have to put some restrictions on num of userOps per sender
      // this.checkSenderUserOpCount();
      this.mempool.push(newEntry);
    }
  }

  removeUserOp(userOpOrHash: string | UserOperationType): void {
    let index = -1;
    if (typeof userOpOrHash === 'string') {
      index = this.mempool.findIndex((entry) => entry.userOpHash === userOpOrHash);
    } else {
      index = this.mempool.findIndex((entry) => entry.userOp === userOpOrHash);
    }
    this.mempool.splice(index, 1);
  }

  findUserOpBySenderAndNonce(sender: string, nonce: BigNumberish): number {
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
}
