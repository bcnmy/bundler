import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { NotifyTransactionListenerParamsType, TransactionMessageType } from '../types';

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionMessageType>;
  retryTransactionQueue: IQueue<TransactionMessageType>;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType): Promise<void>
}
