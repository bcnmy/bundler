import { ITransactionDAO } from '../../../../../common/db';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { NotifyTransactionListenerParamsType } from '../types';

export interface ITransactionListener {
  chainId: number;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  transactionDao: ITransactionDAO;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType): Promise<void>
}
