import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import { ErrorTransactionResponseType, SuccessTransactionResponseType, TransactionDataType } from '../types';

export interface ITransactionService<AccountType> {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  transactionListener: ITransactionListener;
  nonceManager: INonceManager

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
