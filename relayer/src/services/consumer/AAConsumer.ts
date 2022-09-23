import { ConsumeMessage } from 'amqplib';
import { TransactionType, AATransactionMessageType, IQueue } from '../../../../common/types';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class AAConsumer implements ITransactionConsumer<AATransactionMessageType> {
  chainId: number;

  transactionType: TransactionType;

  queue: IQueue<AATransactionMessageType>;

  constructor(
    chainId: number,
    transactionType: TransactionType,
    queue: IQueue<AATransactionMessageType>,
  ) {
    this.chainId = chainId;
    this.transactionType = transactionType;
    this.queue = queue;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      console.log(msg.content.toString(), this.transactionType);
      this.queue?.ack(msg);
    }
  };
}
