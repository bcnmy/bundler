import { INetworkService } from '../../../../../common/network';
import { IQueue } from '../../../../../common/queue';
import { EVMRawTransactionType, TransactionQueueMessageType } from '../../../../../common/types';
import { IEVMAccount } from '../../account';
import { ITransactionService } from '../../transaction-service';

export type EVMRetryTransactionServiceParamsType = {
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>,
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  retryTransactionQueue: IQueue<TransactionQueueMessageType>,
  options: {
    chainId: number
  },
};
