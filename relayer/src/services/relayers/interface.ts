import { ethers } from 'ethers';
import { Network } from 'network-sdk';

export interface IRelayer {
  id: number,
  active: boolean,
  nonce: number,
  balance: ethers.BigNumber,
  balanceThreshold: ethers.BigNumber,
  retryCount: number,
  chainId: number,
  pendingTransactionCount: number,
  pendingTransactionCountThreshold: number,
  network: Network

  create(): Promise<IRelayer>
  setActiveStatus(status: boolean): void
  setBalance(): Promise<void>
  setNonce(): Promise<void>
  setPendingCount(): Promise<void>
  setBalanceThreshold(balanceThreshold: ethers.BigNumber): Promise<void>
  setPendingCountThreshold(pendingTransactionCountThreshold: number): Promise<void>
  setRetryCount(retryCount: number): Promise<void>
}
