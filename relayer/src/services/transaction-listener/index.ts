import { Network } from 'network-sdk';
import { ITransactionListener } from './interface';

export class TransactionListener implements ITransactionListener {
  chainId: number;

  network: Network;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.network = network;
  }

  private onTransactionMined() {

  }

  private onTransactionDropped() {

  }

  private onTransactionFailure() {

  }

  private onTransactionSuccess() {

  }

  notify(transactionResponse: ITransactionResponse): Promise<void> {
  }
}
