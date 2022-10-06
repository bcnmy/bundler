import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../../common/queue';

export interface IConsumer<TransactionMessageType> {
  chainId: number;

  onMessageReceived: (queue: IQueue<TransactionMessageType>, msg: ConsumeMessage) => Promise<void>;
}
