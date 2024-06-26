import { ConsumeMessage } from "amqplib";

export interface IQueue<TransactionMessageType> {
  chainId: number;
  connect(): Promise<void>;
  publish(arg0: TransactionMessageType): Promise<boolean>;
  consume(onMessageReceived: () => void): Promise<boolean>;
  ack(arg0: ConsumeMessage): Promise<void>;
}
