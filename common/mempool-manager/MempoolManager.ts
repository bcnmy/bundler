import { BigNumber, ethers } from 'ethers';
import { MempoolConfigType, MempoolEntry, UserOperationType } from '../types';
import { IMempoolManager } from './interface';
import { MempoolManagerParamsType } from './types';

export class MempoolManager implements IMempoolManager {
  chainId: number;

  entryPoint: ethers.Contract;

  mempoolConfig: MempoolConfigType;

  senderUserOpCount: { [address: string]: number; } = {};

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
    const entry: MempoolEntry = {
      userOp,
      userOpHash,
      markedForBundling: false,
    };
    this.mempool.push(entry);
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

  findUserOpBySenderAndNonce(sender: string, nonce: number): number {
    const index = this.mempool.findIndex((entry) => (
      entry.userOp.sender.toLowerCase() === sender.toLowerCase()
      && BigNumber.from(entry.userOp.nonce).toNumber() === nonce
    ));
    return index;
  }

  checkAndReplaceUserOp(
    oldUserOp: UserOperationType,
    newUserOp: UserOperationType,
  ): UserOperationType {
    const oldMaxPriorityFeePerGas = BigNumber.from(oldUserOp.maxPriorityFeePerGas).toNumber();
    const newMaxPriorityFeePerGas = BigNumber.from(newUserOp.maxPriorityFeePerGas).toNumber();
    const oldMaxFeePerGas = BigNumber.from(oldUserOp.maxFeePerGas).toNumber();
    const newMaxFeePerGas = BigNumber.from(newUserOp.maxFeePerGas).toNumber();
    const {
      minMaxPriorityFeePerGasBumpPercentage,
      minMaxFeePerGasBumpPercentage,
    } = this.mempoolConfig;
    if (
      oldMaxPriorityFeePerGas * (1 + minMaxPriorityFeePerGasBumpPercentage / 100)
      >= newMaxPriorityFeePerGas
    ) {
      return oldUserOp;
    }

    if (
      oldMaxFeePerGas * (1 + minMaxFeePerGasBumpPercentage / 100)
      >= newMaxFeePerGas
    ) {
      return oldUserOp;
    }
    return newUserOp;
  }

  checkSenderUserOpCount(sender: string): number {
    const count = this.mempool.filter(
      (entry) => entry.userOp.sender.toLowerCase() === sender.toLowerCase(),
    ).length;
    return count;
  }
}
