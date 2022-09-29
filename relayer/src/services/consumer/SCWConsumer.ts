import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { TransactionType, SCWTransactionMessageType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import { ITransactionConsumer } from './interface/ITransactionConsumer';

export class SCWConsumer implements ITransactionConsumer<SCWTransactionMessageType> {
  chainId: number;

  private transactionType: TransactionType = TransactionType.SCW;

  relayerManager: IRelayerManager<EVMAccount>;

  queue: IQueue<SCWTransactionMessageType>;

  constructor(
    queue: IQueue<SCWTransactionMessageType>,
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
      console.log('onMessage received in scw', msg.content.toString(), this.transactionType);
      this.queue?.ack(msg);
      // get active relayer
      const activeRelayer = this.relayerManager.getActiveRelayer();
      // call transaction service
    }
  };
}
