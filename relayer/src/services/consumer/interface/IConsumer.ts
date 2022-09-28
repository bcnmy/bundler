import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../../common/queue';

export interface IConsumer<TransactionMessageType> {
  chainId: number;

  queue: IQueue<TransactionMessageType>;

  onMessageReceived: (msg: ConsumeMessage, queue: IQueue<TransactionMessageType>) => Promise<void>;
}
