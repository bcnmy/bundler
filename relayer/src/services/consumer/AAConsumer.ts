import { ConsumeMessage } from 'amqplib';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class AAConsumer implements ITransactionConsumer {
  chainId: number;

  transactionType: string;

  constructor(chainId: number, transactionType: string) {
    this.chainId = chainId;
    this.transactionType = transactionType;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      console.log(msg.content.toString(), this.transactionType);
      // call the relayer manager to get the active relayer
      // call the transaction service
      // with data and active relayer => sendTransaction(ITransaction, A) : ITransaction
      // REVIEW
      // this?.queue?.ack(msg);
    }
  };
}
