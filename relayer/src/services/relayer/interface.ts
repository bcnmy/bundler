import { ethers } from 'ethers';
import { Network } from 'network-sdk';

export interface IRelayer {
  id: number;
  active: boolean;
  nonce: number;
  balance: ethers.BigNumber;
  chainId: number;
  network: Network;
  pendingTransactionCount: number;

  create(): Promise<IRelayer>;
  setActiveStatus(status: boolean): void;
  getRelayerAddress(): string;
  setBalance(): Promise<void>;
  setNonce(): Promise<void>;
}
