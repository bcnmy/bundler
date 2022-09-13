import { ConsumeMessage } from 'amqplib';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  VANILLA_GASLESS = 'VANILLA_GASLESS',
  CROSS_CHAIN = 'CROSS_CHAIN',
}

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
