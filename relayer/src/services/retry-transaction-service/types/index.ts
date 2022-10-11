import { INetworkService } from '../../../../../common/network';
import { IQueue } from '../../../../../common/queue';
import { EVMRawTransactionType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { TransactionMessageType } from '../../transaction-listener/types';
import { ITransactionService } from '../../transaction-service';

export type EVMRetryTransactionServiceParamsType = {
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  retryTransactionQueue: IQueue<TransactionMessageType>,
  options: {
    chainId: number
  },
};
