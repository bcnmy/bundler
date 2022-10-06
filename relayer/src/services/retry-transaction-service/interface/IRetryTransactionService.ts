import { INetworkService } from '../../../../../common/network';
import { IConsumer } from '../../consumer/interface/IConsumer';
import { ITransactionService } from '../../transaction-service/interface/ITransactionService';
import { TransactionQueueMessageType } from '../types';

export interface IRetryTransactionService<AccountType, RawTransactionType>
  extends IConsumer<TransactionQueueMessageType> {
  transactionService: ITransactionService<AccountType, RawTransactionType>;
  networkService: INetworkService<AccountType, RawTransactionType>;
}
