import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { TransactionType, AATransactionMessageType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class AAConsumer implements ITransactionConsumer<AATransactionMessageType> {
  chainId: number;

  private transactionType: TransactionType = TransactionType.AA;

  queue: IQueue<AATransactionMessageType>;

  relayerManager: IRelayerManager<EVMAccount>;

  constructor(
    queue: IQueue<AATransactionMessageType>,
    relayerManager: IRelayerManager<EVMAccount>,
    options: {
      chainId: number,
    },
  ) {
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      console.log(msg.content.toString(), this.transactionType);
      const activeRelayer = this.relayerManager.getActiveRelayer();
      this.queue?.ack(msg);
    }
  };
}
