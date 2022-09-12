import { Network } from 'network-sdk';
import { IRelayer } from '../../relayer/interface';

export interface INonceManager {
  chainId: number;

  network: Network

  relayerNonceMap: Record<string, number>;

  getRelayerNonce(relayer: IRelayer): number;
  getRelayerNonceFromNetwork(relayer: IRelayer): Promise<number>;
  incrementRelayerNonce(relayer: IRelayer): Promise<IRelayer>;
  decrementRelayerNonce(relayer: IRelayer): Promise<IRelayer>;
}
