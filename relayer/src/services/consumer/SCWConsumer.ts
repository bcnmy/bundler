import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { TransactionType, SCWTransactionMessageType } from '../../../../common/types';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class SCWConsumer implements ITransactionConsumer<SCWTransactionMessageType> {
  chainId: number;

  private transactionType: TransactionType = TransactionType.SCW;

  relayer

  queue: IQueue<SCWTransactionMessageType>;

  constructor(
    queue: IQueue<SCWTransactionMessageType>,
    options: {
      chainId: number,
    },
  ) {
    this.queue = queue;
    this.chainId = options.chainId;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      console.log('onMessage received in scw', msg.content.toString(), this.transactionType);
      this.queue?.ack(msg);
      // get active relayer
      const activeRelayer = 
      // call transaction service
    }
  };
}
