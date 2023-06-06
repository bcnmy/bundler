import { ethers } from 'ethers';
import { UserOperationType, MempoolConfigType, MempoolEntry } from '../../types';

export interface IMempoolManager {
  chainId: number;
  entryPoint: ethers.Contract
  mempoolConfig: MempoolConfigType;
  senderUserOpCount: { [address: string]: number };

  countMempoolEntries(): number;
  getMempoolEntries(): MempoolEntry[];
  addUserOp(userOp: UserOperationType, userOpHash: string): void;
  removeUserOp(userOpOrHash: UserOperationType | string): void;
  findUserOpBySenderAndNonce(sender: string, nonce: number): number;
  checkAndReplaceUserOpEntry(
    oldEntry: MempoolEntry,
    newEntry: MempoolEntry
  ): MempoolEntry
  checkSenderUserOpCount(sender: string): number;
  markUserOpIncludedForBundling(userOpHash: string): void;
  unmarkUserOpIncludedForBundling(userOpHash: string): void;
}
