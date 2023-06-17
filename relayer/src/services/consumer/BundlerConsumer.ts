import { ConsumeMessage } from 'amqplib';
import { ICacheService } from '../../../../common/cache';
import { logger } from '../../../../common/log-config';
import { IQueue } from '../../../../common/queue';
import {
  BundlerTransactionMessageType, EntryPointMapType, EVMRawTransactionType, TransactionType,
} from '../../../../common/types';
import { getRetryTransactionCountKey, parseError } from '../../../../common/utils';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { BundlerConsumerParamsType } from './types';

const log = logger(module);
export class BundlerConsumer implements
ITransactionConsumer<IEVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.BUNDLER;

  private queue: IQueue<BundlerTransactionMessageType>;

  chainId: number;

  entryPointMap: EntryPointMapType;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  cacheService: ICacheService;

  constructor(
    bundlerConsumerParamas: BundlerConsumerParamsType,
  ) {
    const {
      options, queue, relayerManager, transactionService, cacheService,
    } = bundlerConsumerParamas;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.chainId = options.chainId;
    this.entryPointMap = options.entryPointMap;
    this.transactionService = transactionService;
    this.cacheService = cacheService;
  }

  onMessageReceived = async (
    msg?: ConsumeMessage,
  ): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue = JSON.parse(msg.content.toString());
      log.info(`onMessage received in ${this.transactionType}: ${JSON.stringify(transactionDataReceivedFromQueue)}`);
      this.queue.ack(msg);
      // get active relayer
      const activeRelayer = await this.relayerManager.getActiveRelayer();
      log.info(`Active relayer for ${this.transactionType} is ${activeRelayer?.getPublicKey()}`);

      if (activeRelayer) {
        const { userOps, to } = transactionDataReceivedFromQueue;

        const entryPointContract = this.entryPointMap[this.chainId][to];

        log.info(`Setting active relayer: ${activeRelayer?.getPublicKey()} as beneficiary for userOps: ${JSON.stringify(userOps)}`);

        // eslint-disable-next-line no-unsafe-optional-chaining
        const { data } = await entryPointContract
          .populateTransaction.handleOps(userOps, activeRelayer.getPublicKey());
        transactionDataReceivedFromQueue.data = data;

        await this.cacheService.set(getRetryTransactionCountKey(
          transactionDataReceivedFromQueue.transactionId,
          this.chainId,
        ), '0');

        try {
          // call transaction service
          const transactionServiceResponse = await this.transactionService.sendTransaction(
            transactionDataReceivedFromQueue,
            activeRelayer,
            this.transactionType,
            this.relayerManager.name,
          );
          log.info(`Response from transaction service for ${this.transactionType} after sending transaction on chainId: ${this.chainId}: ${JSON.stringify(transactionServiceResponse)}`);
          log.info(`Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          await this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
          log.info(`Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          if (transactionServiceResponse.state === 'success') {
            log.info(`Transaction sent successfully for ${this.transactionType} on chain ${this.chainId}`);
          } else {
            log.error(`Transaction failed with error: ${transactionServiceResponse?.error || 'unknown error'} for ${this.transactionType} on chain ${this.chainId}`);
          }
        } catch (error) {
          log.info(`Error in transaction service for transactionType: ${this.transactionType} on chainId: ${this.chainId} with error: ${JSON.stringify(parseError(error))}`);
          log.info(`Adding relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
          this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
          log.info(`Added relayer: ${activeRelayer.getPublicKey()} back to active relayer queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
        }
      } else {
        this.queue.publish(JSON.parse(msg.content.toString()));
        log.info(`No active relayer for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
      }
    } else {
      log.info(`No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`);
    }
  };
}
