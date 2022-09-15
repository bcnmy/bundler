import { ConsumeMessage } from 'amqplib';
import { AATransactionMessageType } from '../../../../common/types';
import { IQueue } from '../../../../common/queue';
import { IConsumer } from './interface/IConsumer';

export class AAConsumer implements IConsumer<AATransactionMessageType> {
  chainId: number;

  transactionType: string;

  queue: IQueue<AATransactionMessageType>;

  constructor(chainId: number, transactionType: string, queue: IQueue<AATransactionMessageType>) {
    this.chainId = chainId;
    this.transactionType = transactionType;
    this.queue = queue;
  }

  onMessageReceived = async (
    msg: ConsumeMessage,
  ) => {
    if (msg) {
      console.log(msg.content.toString(), this.transactionType);
      // call the relayer manager to get the active relayer
      // call the transaction service
      // with data and active relayer => sendTransaction(ITransaction, A) : ITransaction
      this.queue?.ack(msg);
    }
  };
}
