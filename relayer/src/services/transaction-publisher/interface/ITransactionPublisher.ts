import { IQueue } from '../../../../common/queue';

export interface ITransactionPublisher<TransactionMessageType> {
  queue: IQueue<TransactionMessageType>;

  publish(data: TransactionMessageType): Promise<boolean>
}
