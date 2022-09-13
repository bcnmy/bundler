import { Network } from 'network-sdk';
import { INonceManager } from '../nonce-manager';
import { ITransactionListener } from '../transaction-listener';
import { TransactionDataType } from './types';

export interface ITransactionService<AccountType> {
  chainId: number;
  network: Network;
  transactionListener: ITransactionListener;
  nonceManager: INonceManager

  // TODO
  // Check return type
  sendTransaction(transaction: TransactionDataType, account: AccountType): Promise<void>;
}
