import type { ConsumeMessage } from 'amqplib';
import type { ICacheService } from '../../../../common/cache';
import type { ICrossChainTransactionDAO } from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import type { IQueue } from '../../../../common/queue';
import type { CrossChainRetryHandlerQueue } from '../../../../common/queue/CrossChainRetryHandlerQueue';
import {
  EVMRawTransactionType,
  CrossChainTransactionMessageType,
  TransactionType,
  CrossChainTransationStatus,
  CrossChainTransactionError,
} from '../../../../common/types';
import { CCMPTaskManager } from '../../../../cross-chain/task-manager';
import { ICCMPTaskManager } from '../../../../cross-chain/task-manager/interfaces/ICCMPTaskManager';
import type { ICrossChainProcessStep } from '../../../../cross-chain/task-manager/types';
import type { IEVMAccount } from '../account';
import type { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import type { ITransactionService } from '../transaction-service';
import type { ITransactionConsumer } from './interface/ITransactionConsumer';
import type { CCMPConsumerParamsType } from './types';

const log = logger(module);
export class CCMPConsumer implements ITransactionConsumer<IEVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.CROSS_CHAIN;

  private queue: IQueue<CrossChainTransactionMessageType>;

  chainId: number;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  crossChainTransactionDAO: ICrossChainTransactionDAO;

  crossChainRetryHandlerQueue: CrossChainRetryHandlerQueue;

  cacheService: ICacheService;

  constructor(ccmpConsumerParamsType: CCMPConsumerParamsType) {
    const {
      options,
      queue,
      relayerManager,
      transactionService,
      crossChainTransactionDAO,
      crossChainRetryHandlerQueue,
      cacheService,
    } = ccmpConsumerParamsType;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.transactionService = transactionService;
    this.chainId = options.chainId;
    this.crossChainTransactionDAO = crossChainTransactionDAO;
    this.crossChainRetryHandlerQueue = crossChainRetryHandlerQueue;
    this.cacheService = cacheService;
  }

  onMessageReceived = async (msg?: ConsumeMessage): Promise<void> => {
    if (msg) {
      const transactionDataReceivedFromQueue: CrossChainTransactionMessageType = JSON.parse(
        msg.content.toString(),
      );
      const taskManager = await this.getCCMPTaskManagerInstance(transactionDataReceivedFromQueue);
      log.info(
        `onMessage received in ${this.transactionType}: ${JSON.stringify(
          transactionDataReceivedFromQueue,
        )}`,
      );
      this.queue.ack(msg);
      // get active relayer
      const activeRelayer = await this.relayerManager.getActiveRelayer();
      log.info(`Active relayer for ${this.transactionType} is ${activeRelayer?.getPublicKey()}`);
      if (activeRelayer) {
        const transactionServiceResponse = await this.transactionService.sendTransaction(
          {
            ...transactionDataReceivedFromQueue,
            ccmpMessage: transactionDataReceivedFromQueue.message,
            walletAddress: '0xDNE',
          },
          activeRelayer,
          this.transactionType,
          this.relayerManager.name,
        );
        log.info(
          `Response from transaction service after sending transaction on chainId: ${
            this.chainId
          }: ${JSON.stringify(transactionServiceResponse)}`,
        );
        this.relayerManager.addActiveRelayer(activeRelayer.getPublicKey());
        if (transactionServiceResponse.state === 'success') {
          log.info(
            `Transaction sent successfully for ${this.transactionType} on chain ${this.chainId}`,
          );
          await taskManager.run(
            'Handle Relayed',
            CCMPConsumer.handleOnTransactionSuccessFactory(
              transactionServiceResponse.transactionExecutionResponse?.hash,
            ),
            CrossChainTransationStatus.DESTINATION_TRANSACTION_RELAYED,
          );
        } else {
          log.error(
            `Transaction failed with error: ${
              transactionServiceResponse?.error || 'unknown error'
            } for ${this.transactionType} on chain ${this.chainId}`,
          );
          await taskManager.run(
            'Handle Relay Error',
            CCMPConsumer.handleOnTransactionFailureFactory(
              transactionServiceResponse.transactionExecutionResponse?.hash,
              transactionServiceResponse?.error,
            ),
            CrossChainTransationStatus.DESTINATION_TRANSACTION_RELAYED,
          );
        }
      } else {
        this.queue.publish(JSON.parse(msg.content.toString()));
        log.info(
          `No active relayer for transactionType: ${this.transactionType} on chainId: ${this.chainId}`,
        );
      }
    } else {
      throw new Error(
        `No msg received from queue for transactionType: ${this.transactionType} on chainId: ${this.chainId}`,
      );
    }
  };

  private getCCMPTaskManagerInstance = async (
    data: CrossChainTransactionMessageType,
  ): Promise<ICCMPTaskManager> => {
    const sourceChainId = parseInt(data.message.sourceChainId.toString(), 10);
    return new CCMPTaskManager(
      this.crossChainTransactionDAO,
      this.crossChainRetryHandlerQueue,
      data.sourceTxHash,
      sourceChainId,
      data.message,
    );
  };

  private static handleOnTransactionSuccessFactory = (
    destinationTxHash?: string,
  ): ICrossChainProcessStep => {
    const handler: ICrossChainProcessStep = async (data) => ({
      ...data,
      status: CrossChainTransationStatus.DESTINATION_TRANSACTION_RELAYED,
      context: {
        destinationTxHash,
      },
    });
    return handler;
  };

  private static handleOnTransactionFailureFactory = (
    destinationTxHash?: string,
    error?: string,
  ): ICrossChainProcessStep => {
    const handler: ICrossChainProcessStep = async (data) => ({
      ...data,
      status: CrossChainTransactionError.DESTINATION_TRANSACTION_REVERTED,
      context: {
        destinationTxHash,
        error,
      },
    });
    return handler;
  };
}
