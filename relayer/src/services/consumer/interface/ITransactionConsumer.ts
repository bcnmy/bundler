import { EVMAccount } from '../../account';
import { IRelayerManager } from '../../relayer-manager';
import { ITransactionService } from '../../transaction-service';
import { IConsumer } from './IConsumer';

export interface ITransactionConsumer<TransactionMessageType>
  extends IConsumer<TransactionMessageType> {
  relayerManager: IRelayerManager<EVMAccount>;
  transactionService: ITransactionService<EVMAccount>
}
