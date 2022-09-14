import { IQueue } from '../../../../../common/interface';

export interface ITransactionPublisher<TransactionMessageType> {
  queue: IQueue<TransactionMessageType>;

  publish(data: TransactionMessageType): Promise<boolean>
}
