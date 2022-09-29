import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { TransactionType, SCWTransactionMessageType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { SCWConsumerParamsType } from './types';

const log = logger(module);
export class SCWConsumer implements ITransactionConsumer<SCWTransactionMessageType> {
  chainId: number;

  private transactionType: TransactionType = TransactionType.SCW;

  relayerManager: IRelayerManager<EVMAccount>;

  transactionService: ITransactionService<EVMAccount>;

  queue: IQueue<SCWTransactionMessageType>;

  constructor(
    scwConsumerParamsType: SCWConsumerParamsType,
  ) {
    const {
      options, queue, relayerManager, transactionService,
    } = scwConsumerParamsType;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.transactionService = transactionService;
    this.chainId = options.chainId;
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
