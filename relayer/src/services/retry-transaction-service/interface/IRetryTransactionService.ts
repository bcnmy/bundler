import { IConsumer } from '../../consumer/interface/IConsumer';
import { ITransactionService } from '../../transaction-service/interface/ITransactionService';
import { TransactionQueueMessageType } from '../types';

export interface IRetryTransactionService<AccountType>
  extends IConsumer<TransactionQueueMessageType> {
  transactionService: ITransactionService<AccountType>;
  chainId: number;
}
