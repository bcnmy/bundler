import { Network } from 'network-sdk';

export interface ITransactionListener extends ITransactionPublisher {
  chainId: number;
  network: Network;

  notify(transactionResponse: ITransactionResponse): Promise<void>
}
