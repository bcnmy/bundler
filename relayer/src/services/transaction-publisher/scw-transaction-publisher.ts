import { IQueue, SCWTransactionMessageType } from '../../../../common/interface';
import { ITransactionPublisher } from './interface';

export class SCWTransactionPublisher implements ITransactionPublisher<SCWTransactionMessageType> {
  queue: IQueue<SCWTransactionMessageType>;

  publish(data: SCWTransactionMessageType): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
