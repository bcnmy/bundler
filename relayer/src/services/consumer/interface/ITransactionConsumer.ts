import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';
import { IConsumer } from './IConsumer';

export interface ITransactionConsumer<TransactionMessageType, AccountType, RawTransactionType>
  extends IConsumer<TransactionMessageType> {
  relayerManager: IRelayerManager<AccountType, RawTransactionType>;
  transactionService: ITransactionService<AccountType, RawTransactionType>
}
