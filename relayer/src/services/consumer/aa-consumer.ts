import { ConsumeMessage } from 'amqplib';
import { AATransactionMessageType, IQueue } from '../../../../common/interface';
import { IConsumer } from './interface';

export class AAConsumer implements IConsumer<AATransactionMessageType> {
  chainId: number;

  transactionType: string;

  constructor(chainId: number, transactionType: string) {
    this.chainId = chainId;
    this.transactionType = transactionType;
  }

  onMessageReceived = async (msg?: ConsumeMessage, queue?: IQueue<AATransactionMessageType>) => {
    if (msg) {
      console.log(msg.content.toString(), this.transactionType);
      queue?.ack(msg);
    }
  };
}
