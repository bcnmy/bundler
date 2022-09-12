import { Network } from 'network-sdk';

export interface ITransactionService<AccountType> {
  chainId: number;
  network: Network;
  transactionListener: ITransactionListener;
  nonceManager: INonceManager

  // TODO
  // Check return type
  sendTransaction(transaction: ITransaction, account: AccountType): Promise<void>;
}
