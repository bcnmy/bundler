import { IConsumer } from './IConsumer';

export interface ITransactionConsumer extends IConsumer {
  transactionType: string
}
