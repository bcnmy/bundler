import { ethers } from 'ethers';
import { Network } from 'network-sdk';

export interface IRelayer {
  id: number,
  active: boolean,
  nonce: number,
  balance: ethers.BigNumber,
  chainId: number,
  network: Network

  create(): Promise<IRelayer>
  setActiveStatus(status: boolean): void
  setBalance(): Promise<void>
  setNonce(): Promise<void>
}
