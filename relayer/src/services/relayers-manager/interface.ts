import { Network } from 'network-sdk';
import { IRelayer } from '../relayer/interface';

export interface IRelayerManager {
  network: Network,
  chainId: number,
  relayersMap: Record<string, IRelayer>, // check usage
  retryCountMap: Record<string, number>, // check usage
  minimumRelayerCount: number,
  maximumRelayerCount: number,
  newRelayerInstanceCreated: number, // check usage
  relayerCapacityThreshold: number, // check usage
  mainAccountAddress: string,
  mainAccountNonce: number,

  createRelayers(numberOfRelayers: number): Promise<void>
  fetchActiveRealyer(): Promise<IRelayer>
  updateRelayerBalance(relayer: IRelayer): Promise<number>
  incrementRelayerNonce(relayer: IRelayer): number
  incrementRelayerPendingCount(relayer: IRelayer): number
  decrementRelayerPendingCount(relayer: IRelayer): number
  fundRelayer(address: string): Promise<void>
  getMainAccountNonce(): Promise<number>
  getMainAccountNonceFromNetwork(): Promise<number>
}
