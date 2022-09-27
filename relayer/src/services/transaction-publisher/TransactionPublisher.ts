import { IQueue } from '../../../../common/interface';
import { ITransactionPublisher } from './interface/ITransactionPublisher';
import { TransactionQueueMessageType } from './types';

export class TransactionPublisher implements ITransactionPublisher<TransactionQueueMessageType> {
  queue: IQueue<TransactionQueueMessageType>;

  publish(data: TransactionQueueMessageType): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
