import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../../common/queue';

export interface IConsumer<TransactionMessageType> {

  chainId: number;
  transactionType: string; // ENUM from common

  onMessageReceived: (msg: ConsumeMessage, queue: IQueue<TransactionMessageType>) => Promise<void>;
}
