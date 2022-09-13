import { ConsumeMessage } from 'amqplib';

export type AATransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
};

export interface IQueue<TransactionMessageType> {
  chainId: number;
  transactionType?: string;
  connect(): Promise<void>
  publish(arg0: TransactionMessageType): Promise<boolean>
  consume(): Promise<boolean>
  ack(arg0: ConsumeMessage): Promise<void>
}

// export interface IQueuePublisher<TransactionMessageType> extends IQueue {
// }

// export interface IQueueConsumer<TransactionMessageType> extends IQueue {
//   channel: Channel;
// }
