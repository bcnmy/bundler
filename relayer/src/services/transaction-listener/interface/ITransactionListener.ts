import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { NotifyTransactionListenerParamsType, TransactionMessageType } from '../types';

export interface ITransactionListener {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionMessageType>;
  retryTransactionQueue: IQueue<TransactionMessageType>;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType): Promise<void>
}
