import { ICacheService } from '../../../../../common/cache';
import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import { NotifyTransactionListenerParamsType, TransactionListenerNotifyReturnType, TransactionMessageType } from '../types';

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionMessageType>;
  retryTransactionQueue: IQueue<RetryTransactionQueueData>;
  cacheService: ICacheService;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType):
  Promise<TransactionListenerNotifyReturnType>
}
