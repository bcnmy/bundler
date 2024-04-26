import { ICacheService } from "../../../common/cache";
import { ITransactionDAO } from "../../../common/db";
import { INetworkService } from "../../../common/network";
import { IQueue } from "../../../common/queue";
import { RetryTransactionQueueData } from "../../../common/queue/types";
import { TransactionQueueMessageType } from "../../../common/types";
import { NotifyTransactionListenerParamsType } from "../types";

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionQueueMessageType>;
  retryTransactionQueue: IQueue<RetryTransactionQueueData>;
  cacheService: ICacheService;

  notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<boolean>;
}
