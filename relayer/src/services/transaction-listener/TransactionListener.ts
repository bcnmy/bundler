import { Network } from 'network-sdk';
import { IQueue } from '../../../../common/interface';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import { TransactionListenerMessageType } from './types/types';

// eslint-disable-next-line max-len
export class TransactionListener implements ITransactionListener, ITransactionPublisher<TransactionListenerMessageType> {
  chainId: number;

  networkService: Network;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.networkService = network;
  }

  queue: IQueue<TransactionListenerMessageType>;

  publish(data: TransactionListenerMessageType): Promise<boolean> {
    throw new Error('Method not implemented.');
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
