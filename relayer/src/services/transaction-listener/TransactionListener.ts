import { Network } from 'network-sdk';
import { IQueue } from '../../../../common/types';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener/ITransactionListener';
import { TransactionListenerMessageType } from './types/types/types';

// eslint-disable-next-line max-len
export class TransactionListener implements ITransactionListener, ITransactionPublisher<TransactionListenerMessageType> {
  chainId: number;

  networkServiceService: Network;

  constructor(chainId: number, network: Network) {
    this.chainId = chainId;
    this.networkServiceService = network;
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
