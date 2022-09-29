import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { TransactionType, AATransactionMessageType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { AAConsumerParamsType } from './types';

const log = logger(module);
export class AAConsumer implements ITransactionConsumer<AATransactionMessageType> {
  chainId: number;

  private transactionType: TransactionType = TransactionType.AA;

  queue: IQueue<AATransactionMessageType>;

  relayerManager: IRelayerManager<EVMAccount>;

  transactionService: ITransactionService<EVMAccount>;

  constructor(
    aaConsumerParams: AAConsumerParamsType,
  ) {
    const {
      options, queue, relayerManager, transactionService,
    } = aaConsumerParams;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
    this.transactionService = transactionService;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ) => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(msg.content.toString());
      log.info(`onMessage received in ${this.transactionType}: ${transactionDataReceivedFromQueue}`);
      this.queue?.ack(msg);
      // get active relayer
      const activeRelayer = this.relayerManager.getActiveRelayer();
      if (activeRelayer) {
      // call transaction service
      // TODO check on return logic
        await this.transactionService.sendTransaction(
          transactionDataReceivedFromQueue,
          activeRelayer,
        );
      } else {
        throw new Error(`No active relayer for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
      }
    } else {
      throw new Error(`No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
    }
  };
}
