import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { TransactionQueueMessageType } from '../../../../../common/types';
import { NotifyTransactionListenerParamsType, TransactionListenerNotifyReturnType } from '../types';

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionQueueMessageType>;
  retryTransactionQueue: IQueue<TransactionQueueMessageType>;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType):
  Promise<TransactionListenerNotifyReturnType>
}
