import { ICacheService } from '../../../../../common/cache';
import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { TransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import {
  ErrorTransactionResponseType,
  ExecuteTransactionParamsType,
  ExecuteTransactionResponseType,
  RetryTransactionDataType,
  SuccessTransactionResponseType,
  TransactionDataType,
} from '../types';

export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;
  cacheService: ICacheService

  executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
    transactionId: string,
  ): Promise<ExecuteTransactionResponseType>;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType,
    transactionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
  retryTransaction(
    transaction: RetryTransactionDataType,
    account: IEVMAccount,
    transactionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
