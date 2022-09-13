import { Network } from 'network-sdk';

export interface ITransactionListener {
  chainId: number;
  network: Network;

  notify(transactionResponse: TransactionResponseType): Promise<void>
}
