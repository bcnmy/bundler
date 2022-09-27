import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { TransactionType, AATransactionMessageType } from '../../../../common/types';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class AAConsumer implements ITransactionConsumer<AATransactionMessageType> {
  chainId: number;

  transactionType: TransactionType;

  queue: IQueue<AATransactionMessageType>;

  constructor(
    queue: IQueue<AATransactionMessageType>,
    options: {
      chainId: number,
      transactionType: TransactionType,
    },
  ) {
    this.queue = queue;
    this.chainId = options.chainId;
    this.transactionType = options.transactionType;
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
