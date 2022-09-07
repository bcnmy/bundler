import { Network } from 'network-sdk';
import { IRelayer } from '../relayer/interface';

export interface IRelayerManager {
  network: Network;
  chainId: number;
  minimumRelayerCount: number;
  maximumRelayerCount: number;
  mainAccountAddress: string;
  mainAccountNonce: number;
  relayerMap: Record<string, IRelayer>;
  retryCountMap: Record<string, number>;
  pendingTransactionCountMap: Record<string, number>
  relayerCapacityThreshold: number;

  createRelayers(numberOfRelayers: number): Promise<void>;
  fetchActiveRelayer(): Promise<IRelayer>;
  updateRelayerBalance(relayer: IRelayer): Promise<IRelayer>;
  incrementRelayerPendingCount(relayer: IRelayer): IRelayer;
  decrementRelayerPendingCount(relayer: IRelayer): IRelayer;
  fundRelayer(relayer: IRelayer): Promise<IRelayer>;
  getMainAccountNonce(): number;
  getMainAccountNonceFromNetwork(): Promise<number>;
}
