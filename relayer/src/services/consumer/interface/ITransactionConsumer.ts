import { IConsumer } from './IConsumer';

export interface ITransactionConsumer<TransactionMessageType>
  extends IConsumer<TransactionMessageType> {
}
