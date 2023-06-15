import { ethers } from 'ethers';
import { UserOperationType, MempoolConfigType, MempoolEntry } from '../../types';
import { ICacheService } from '../../cache';

export interface IMempoolManager {
  chainId: number;
  entryPoint: ethers.Contract
  mempoolConfig: MempoolConfigType;
  senderUserOpCount: { [address: string]: number };
  cacheService: ICacheService;

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
  updateCacheMempool(): void;
  setEventHandler(handler: (force: boolean) => void): void;
  fireUserOpAddedEvent(): void;
}
