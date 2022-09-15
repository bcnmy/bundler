import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../../common/queue';
import { TransactionType } from '../../../../../common/types';

export interface IConsumer<TransactionMessageType> {

  chainId: number;
  transactionType: TransactionType; // ENUM from common

  queue: IQueue<TransactionMessageType>;

  onMessageReceived: (msg: ConsumeMessage, queue: IQueue<TransactionMessageType>) => Promise<void>;
}
