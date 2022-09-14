import { IConsumer } from '../../consumer/interface/IConsumer';
import { ITransactionService } from '../../transaction-service/interface/ITransactionService';

export interface IRetryTransactionService<AccountType> extends IConsumer {
  transactionService: ITransactionService<AccountType>;

  getBumpedGasPrice(pastGasPrice: string, bumpingPercentage: number): Promise<string>
}
