import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { INonceManager } from '../../nonce-manager';
import { ITransactionListener } from '../../transaction-listener';
import { ErrorTransactionResponseType, SuccessTransactionResponseType, TransactionDataType } from '../types';

export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
