import { AATransactionMessageType, IQueue } from '../../../../common/interface';
import { ITransactionPublisher } from './interface';

export class AATransactionPublisher implements ITransactionPublisher<AATransactionMessageType> {
  queue: IQueue<AATransactionMessageType>;

  publish(data: AATransactionMessageType): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
