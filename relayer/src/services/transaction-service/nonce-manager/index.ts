import { Network } from 'network-sdk';
import { IRelayer } from '../../relayer/interface';
import { INonceManager } from './interface';

export class NonceManager implements INonceManager {
  chainId: number;

  network: Network;

  relayer: IRelayer;

  constructor(relayer: IRelayer, network: Network) {
    this.relayer = relayer;
    this.chainId = relayer.chainId;
    this.network = network;
  }

  getRelayerNonce(): number {
    return relayer.nonce;
  }

  getRelayerNonceFromNetwork(relayer: IRelayer): Promise<number> {
    return this.network.getNonce(relayer.getRelayerAddress())
  }

  incrementRelayerNonce(relayer: IRelayer): Promise<IRelayer> {

  }

  decrementRelayerNonce(relayer: IRelayer): Promise<IRelayer> {

  }
}
