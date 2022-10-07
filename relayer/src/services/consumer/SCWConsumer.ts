import { ConsumeMessage } from 'amqplib';
import { logger } from '../../../../common/log-config';
import { IQueue } from '../../../../common/queue';
import { EVMRawTransactionType, SCWTransactionMessageType, TransactionType } from '../../../../common/types';
import { EVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { SCWConsumerParamsType } from './types';

const log = logger(module);
export class SCWConsumer implements
ITransactionConsumer<EVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.SCW;

  private queue: IQueue<SCWTransactionMessageType>;

  chainId: number;

  relayerManager: IRelayerManager<EVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<EVMAccount, EVMRawTransactionType>;

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
      log.info(`onMessage received in ${this.transactionType}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);
      // get active relayer
      const activeRelayer = await this.relayerManager.getActiveRelayer();
      log.info(`Active relayer for ${this.transactionType} is ${activeRelayer?.getPublicKey()}`);
      if (activeRelayer) {
        const response = await this.transactionService.sendTransaction(
          transactionDataReceivedFromQueue,
          activeRelayer,
        );
        this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
        if (response.state === 'success') {
          log.info(`Transaction sent successfully for ${this.transactionType} on chain ${this.chainId}`);
        } else {
          log.error(`Transaction failed with error: ${response?.error || 'unknown error'} for ${this.transactionType} on chain ${this.chainId}`);
        }
      } else {
        throw new Error(`No active relayer for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
      }
    } else {
      throw new Error(`No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
    }
  };
}
