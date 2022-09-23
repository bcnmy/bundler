import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import { TransactionDataType } from '../types';

export interface ITransactionService<AccountType> {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  transactionListener: ITransactionListener;
  nonceManager: INonceManager

  // TODO
  // Check return type
  sendTransaction(transaction: TransactionDataType, account: AccountType): Promise<void>;
}
