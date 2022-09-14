import { Network } from 'network-sdk';

export interface ITransactionListener {
  chainId: number;
  networkService: Network;

  notify(transactionResponse: TransactionResponseType): Promise<void>
}
