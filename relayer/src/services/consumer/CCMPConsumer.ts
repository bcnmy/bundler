import { ConsumeMessage } from 'amqplib';
import {
  ICrossChainTransactionDAO,
} from '../../../../common/db';
import { logger } from '../../../../common/log-config';
import { IQueue } from '../../../../common/queue';
import {
  EVMRawTransactionType,
  CrossChainTransactionMessageType,
  TransactionType,
  CrossChainTransationStatus,
  CrossChainTransactionError,
} from '../../../../common/types';
import { CCMPTaskManager } from '../../../../cross-chain/task-manager';
import { ICCMPTaskManager, IHandler } from '../../../../cross-chain/task-manager/types';
import { IEVMAccount } from '../account';
import { IRelayerManager } from '../relayer-manager/interface/IRelayerManager';
import { ITransactionService } from '../transaction-service';
import { ITransactionConsumer } from './interface/ITransactionConsumer';
import { CCMPConsumerParamsType } from './types';

const log = logger(module);
export class CCMPConsumer implements ITransactionConsumer<IEVMAccount, EVMRawTransactionType> {
  private transactionType: TransactionType = TransactionType.CROSS_CHAIN;

  private queue: IQueue<CrossChainTransactionMessageType>;

  chainId: number;

  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;

  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;

  crossChainTransactionDAO: ICrossChainTransactionDAO;

  constructor(ccmpConsumerParamsType: CCMPConsumerParamsType) {
    const {
      options, queue, relayerManager, transactionService, crossChainTransactionDAO,
    } = ccmpConsumerParamsType;
    this.queue = queue;
    this.relayerManager = relayerManager;
    this.transactionService = transactionService;
    this.chainId = options.chainId;
    this.crossChainTransactionDAO = crossChainTransactionDAO;
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
          transactionDataReceivedFromQueue,
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
            CCMPConsumer.handleOnTransactionSuccessFailureFactory(
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
    const state = await this.crossChainTransactionDAO.getByTransactionId(
      sourceChainId,
      data.message.hash,
    );
    return new CCMPTaskManager(
      this.crossChainTransactionDAO,
      data.sourceTxHash,
      sourceChainId,
      data.message,
      data.executionIndex,
      state,
    );
  };

  private static handleOnTransactionSuccessFactory = (destinationTxHash?: string): IHandler => {
    const handler: IHandler = async (data, ctx) => {
      if (destinationTxHash) {
        ctx.setDestinationTxHash(destinationTxHash);
      }
      return {
        ...data,
        status: CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED,
        context: {
          destinationTxHash,
        },
      };
    };
    return handler;
  };

  private static handleOnTransactionSuccessFailureFactory = (
    destinationTxHash?: string,
    error?: string,
  ): IHandler => {
    const handler: IHandler = async (data, ctx) => {
      if (destinationTxHash) {
        ctx.setDestinationTxHash(destinationTxHash);
      }

      return {
        ...data,
        status: CrossChainTransactionError.DESTINATION_TRANSACTION_REVERTED,
        context: {
          destinationTxHash,
          error,
        },
      };
    };
    return handler;
  };
}
