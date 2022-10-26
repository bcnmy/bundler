import { INetworkService } from '../../../../../common/network';
import { IQueue } from '../../../../../common/queue';
import { RetryTransactionQueueData } from '../../../../../common/queue/types';
import { EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount } from '../../account';
import { ITransactionService } from '../../transaction-service';

export type EVMRetryTransactionServiceParamsType = {
  transactionService: ITransactionService<EVMAccount, EVMRawTransactionType>,
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
  retryTransactionQueue: IQueue<RetryTransactionQueueData>,
  options: {
    chainId: number
  },
};
