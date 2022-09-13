import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';

export interface IConsumer<TransactionMessageType> {

  onMessageReceived: (msg: ConsumeMessage, queue: IQueue<TransactionMessageType>) => Promise<void>;
}
