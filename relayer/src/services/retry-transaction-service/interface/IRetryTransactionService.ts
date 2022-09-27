import { IConsumer } from '../../consumer/interface/IConsumer';
import { TransactionQueueMessageType } from '../../transaction-publisher';
import { ITransactionService } from '../../transaction-service/interface/ITransactionService';

export interface IRetryTransactionService<AccountType>
  extends IConsumer<TransactionQueueMessageType> {
  transactionService: ITransactionService<AccountType>;
  chainId: number;

  getBumpedGasPrice(pastGasPrice: string, bumpingPercentage: number): Promise<string>
}
