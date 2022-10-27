import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { TransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import {
  ErrorTransactionResponseType,
  RetryTransactionDataType,
  SuccessTransactionResponseType, TransactionDataType,
} from '../types';

export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType,
    tranasctionType: TransactionType
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
  retryTransaction(
    transaction: RetryTransactionDataType,
    account: IEVMAccount,
    tranasctionType: TransactionType
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
