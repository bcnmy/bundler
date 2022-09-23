import { ITransactionDAO } from '../../../../../common/db';
import { IQueue } from '../../../../../common/interface';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account/interface/IEVMAccount';
import { NotifyTransactionListenerParamsType, TransactionListenerMessageType } from '../types';

export interface ITransactionListener {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  queue: IQueue<TransactionListenerMessageType>;
  transactionDao: ITransactionDAO;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType): Promise<void>
}
