import { IQueue } from '../../../../../common/interface';
import { TransactionQueueMessageType } from '../../transaction-publisher';
import { ITransactionService } from '../../transaction-service/interface/ITransactionService';

export interface IRetryTransactionService<AccountType> extends IQueue<TransactionQueueMessageType> {
  transactionService: ITransactionService<AccountType>;

  getBumpedGasPrice(pastGasPrice: string, bumpingPercentage: number): Promise<string>
}
