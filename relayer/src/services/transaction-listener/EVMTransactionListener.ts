import { ICacheService } from '../../../../common/cache';
import { ICrossChainTransactionDAO, ITransactionDAO } from '../../../../common/db';
import { IQueue } from '../../../../common/interface';
import { logger } from '../../../../common/log-config';
import { INetworkService } from '../../../../common/network';
import { CrossChainRetryHandlerQueue } from '../../../../common/queue/CrossChainRetryHandlerQueue';
import { RetryTransactionQueueData } from '../../../../common/queue/types';
import {
  CCMPMessage,
  CrossChainTransactionError,
  CrossChainTransationStatus,
  EVMRawTransactionType,
  SocketEventType,
  TransactionQueueMessageType,
  TransactionStatus,
  TransactionType,
} from '../../../../common/types';
import { getRetryTransactionCountKey } from '../../../../common/utils';
import { CCMPTaskManager } from '../../../../server/src/services/cross-chain/task-manager';
import { ICCMPTaskManager } from '../../../../server/src/services/cross-chain/task-manager/interfaces/ICCMPTaskManager';
import { ICrossChainProcessStep } from '../../../../server/src/services/cross-chain/task-manager/types';
import { IEVMAccount } from '../account';
import { ITransactionPublisher } from '../transaction-publisher';
import { ITransactionListener } from './interface/ITransactionListener';
import {
  EVMTransactionListenerParamsType,
  NewTransactionDataToBeSavedInDatabaseType,
  NotifyTransactionListenerParamsType,
  OnTransactionFailureParamsType,
  OnTransactionSuccessParamsType,
  TransactionDataToBeUpdatedInDatabaseType,
  TransactionListenerNotifyReturnType,
} from './types';

const log = logger(module);

export class EVMTransactionListener
implements
    ITransactionListener<IEVMAccount, EVMRawTransactionType>,
    ITransactionPublisher<TransactionQueueMessageType> {
  chainId: number;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  transactionQueue: IQueue<TransactionQueueMessageType>;

  retryTransactionQueue: IQueue<RetryTransactionQueueData>;

  transactionDao: ITransactionDAO;

  cacheService: ICacheService;

  crossChainTransactionDAO: ICrossChainTransactionDAO;

  crossChainRetryHandlerQueueMap: Record<number, CrossChainRetryHandlerQueue>;

  constructor(evmTransactionListenerParams: EVMTransactionListenerParamsType) {
    const {
      options,
      networkService,
      transactionQueue,
      retryTransactionQueue,
      transactionDao,
      cacheService,
      crossChainTransactionDAO,
      crossChainRetryHandlerQueueMap,
    } = evmTransactionListenerParams;
    this.chainId = options.chainId;
    this.networkService = networkService;
    this.transactionQueue = transactionQueue;
    this.retryTransactionQueue = retryTransactionQueue;
    this.transactionDao = transactionDao;
    this.cacheService = cacheService;
    this.crossChainTransactionDAO = crossChainTransactionDAO;
    this.crossChainRetryHandlerQueueMap = crossChainRetryHandlerQueueMap;
  }

  async publishToTransactionQueue(data: TransactionQueueMessageType): Promise<boolean> {
    await this.transactionQueue.publish(data);
    return true;
  }

  async publishToRetryTransactionQueue(data: RetryTransactionQueueData): Promise<boolean> {
    await this.retryTransactionQueue.publish(data);
    return true;
  }

  private async onTransactionSuccess(onTranasctionSuccessParams: OnTransactionSuccessParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      relayerManagerName,
      transactionReceipt,
      transactionType,
      ccmpMessage,
    } = onTranasctionSuccessParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }

    log.info(
      `Publishing to transaction queue on success for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`,
    );
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: transactionExecutionResponse,
      event: SocketEventType.onTransactionMined,
    });

    if (transactionExecutionResponse) {
      log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
      await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        receipt: transactionReceipt,
        status: TransactionStatus.SUCCESS,
        updationTime: Date.now(),
      }, transactionId, transactionExecutionResponse?.hash);
    }

    try {
      if (transactionType === TransactionType.CROSS_CHAIN) {
        if (!ccmpMessage) {
          // TODO Needs Investigation, this randomly becomes undefined
          throw new Error(`CCMP message not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
        }
        log.info(
          `Processing onTransactionSuccess for cross chain transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        if (!transactionReceipt) {
          log.info(
            `Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`,
          );
          return;
        }
        const ccmpTaskManager = await this.getCCMPTaskManagerInstance(ccmpMessage!);

        await ccmpTaskManager.run(
          'Handle Relayed',
          EVMTransactionListener.handleCCMPOnTransactionSuccessFactory(
            transactionReceipt.transactionHash,
          ),
          CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED,
        );
      }
    } catch (e) {
      log.error(
        `Error while processing onTransactionSuccess for cross chain transactionId: ${transactionId} on chainId ${this.chainId}`,
        e,
      );
    }
  }

  private async onTransactionFailure(onTranasctionFailureParams: OnTransactionFailureParamsType) {
    const {
      transactionExecutionResponse,
      transactionId,
      transactionReceipt,
      relayerManagerName,
      transactionType,
      ccmpMessage,
    } = onTranasctionFailureParams;
    if (!transactionReceipt) {
      log.error(`Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
      return;
    }
    log.info(`Publishing to transaction queue on failure for transactionId: ${transactionId} to transaction queue on chainId ${this.chainId}`);
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: transactionExecutionResponse,
      event: SocketEventType.onTransactionMined,
    });

    if (transactionExecutionResponse) {
      log.info(`Saving transaction data in database for transactionId: ${transactionId} on chainId ${this.chainId}`);
      await this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        receipt: transactionReceipt,
        status: TransactionStatus.FAILED,
        updationTime: Date.now(),
      }, transactionId, transactionExecutionResponse?.hash);
    }

    try {
      if (transactionType === TransactionType.CROSS_CHAIN) {
        if (!ccmpMessage) {
          throw new Error(`CCMP message not found for transactionId: ${transactionId} on chainId ${this.chainId}`);
        }
        log.info(
          `Processing onTransactionFailure for cross chain transactionId: ${transactionId} on chainId ${this.chainId}`,
        );
        if (!transactionReceipt) {
          log.info(
            `Transaction receipt not found for transactionId: ${transactionId} on chainId ${this.chainId}`,
          );
          return;
        }
        const ccmpTaskManager = await this.getCCMPTaskManagerInstance(ccmpMessage!);

        await ccmpTaskManager.run(
          'Handle Failed',
          EVMTransactionListener.handleCCMPOnTransactionFailureFactory(
            transactionReceipt.transactionHash,
          ),
          CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED,
        );
      }
    } catch (e) {
      log.error(
        `Error while processing onTransactionFailure for cross chain transactionId: ${transactionId} on chainId ${this.chainId}`,
        e,
      );
    }
  }

  private async updateTransactionDataToDatabase(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionId(
      this.chainId,
      transactionId,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async saveNewTransactionDataToDatabase(
    newTransactionDataToBeSavedInDatabase: NewTransactionDataToBeSavedInDatabaseType,
  ): Promise<void> {
    await this.transactionDao.save(
      this.chainId,
      newTransactionDataToBeSavedInDatabase,
    );
  }

  private async updateTransactionDataToDatabaseByTransactionIdAndTransactionHash(
    transactionDataToBeUpdatedInDatabase: TransactionDataToBeUpdatedInDatabaseType,
    transactionId: string,
    transactionHash: string,
  ): Promise<void> {
    await this.transactionDao.updateByTransactionIdAndTransactionHash(
      this.chainId,
      transactionId,
      transactionHash,
      transactionDataToBeUpdatedInDatabase,
    );
  }

  private async waitForTransaction(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ) {
    const {
      transactionExecutionResponse,
      transactionId,
      relayerAddress,
      previousTransactionHash,
      walletAddress,
      metaData,
      transactionType,
      relayerManagerName,
      ccmpMessage,
    } = notifyTransactionListenerParams;
    if (!transactionExecutionResponse) {
      return;
    }
    // TODO : add error check
    const tranasctionHash = transactionExecutionResponse.hash;
    log.info(
      `Transaction hash is: ${tranasctionHash} for transactionId: ${transactionId} on chainId ${this.chainId}`,
    );

    const transactionReceipt = await this.networkService.waitForTransaction(tranasctionHash);
    log.info(
      `Transaction receipt is: ${JSON.stringify(
        transactionReceipt,
      )} for transactionId: ${transactionId} on chainId ${this.chainId}`,
    );

    // TODO: reduce pending count of relayer via RelayerManager
    await this.cacheService.delete(getRetryTransactionCountKey(transactionId, this.chainId));

    if (transactionReceipt.status === 1) {
      log.info(
        `Transaction is a success for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      await this.onTransactionSuccess({
        transactionExecutionResponse,
        transactionId,
        transactionReceipt,
        relayerAddress,
        transactionType,
        previousTransactionHash,
        walletAddress,
        metaData,
        relayerManagerName,
        ccmpMessage,
      });
    }
    if (transactionReceipt.status === 0) {
      log.info(
        `Transaction is a failure for transactionId: ${transactionId} on chainId ${this.chainId}`,
      );
      await this.onTransactionFailure({
        transactionExecutionResponse,
        transactionId,
        transactionReceipt,
        relayerAddress,
        transactionType,
        previousTransactionHash,
        walletAddress,
        metaData,
        relayerManagerName,
        ccmpMessage,
      });
    }
  }

  async notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<TransactionListenerNotifyReturnType> {
    const {
      transactionExecutionResponse,
      transactionId,
      rawTransaction,
      relayerAddress,
      transactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      previousTransactionHash,
      error,
    } = notifyTransactionListenerParams;

    if (!transactionExecutionResponse) {
      await this.publishToTransactionQueue({
        transactionId,
        relayerManagerName,
        error,
        event: SocketEventType.onTransactionError,
      });
      log.error('transactionExecutionResponse is null');
      return {
        isTransactionRelayed: false,
        transactionExecutionResponse: null,
      };
    }

    if (!previousTransactionHash) {
    // Save initial transaction data to database
      this.updateTransactionDataToDatabase({
        transactionHash: transactionExecutionResponse.hash,
        rawTransaction: transactionExecutionResponse,
        relayerAddress,
        gasPrice: transactionExecutionResponse.gasPrice,
        status: TransactionStatus.PENDING,
        updationTime: Date.now(),
      }, transactionId);
    } else {
      this.updateTransactionDataToDatabaseByTransactionIdAndTransactionHash({
        resubmitted: true,
        status: TransactionStatus.DROPPED,
        updationTime: Date.now(),
      }, transactionId, previousTransactionHash);
      this.saveNewTransactionDataToDatabase({
        transactionId,
        transactionType,
        transactionHash: transactionExecutionResponse.hash,
        previousTransactionHash,
        status: TransactionStatus.PENDING,
        rawTransaction: transactionExecutionResponse,
        chainId: this.chainId,
        gasPrice: transactionExecutionResponse.gasPrice,
        relayerAddress,
        walletAddress,
        metaData,
        resubmitted: false,
        creationTime: Date.now(),
        updationTime: Date.now(),
      });
    }

    // transaction queue is being listened by socket service to notify the client about the hash
    await this.publishToTransactionQueue({
      transactionId,
      relayerManagerName,
      transactionHash: transactionExecutionResponse?.hash,
      receipt: transactionExecutionResponse,
      event: previousTransactionHash
        ? SocketEventType.onTransactionHashChanged : SocketEventType.onTransactionHashGenerated,
    });
    // retry txn service will check for receipt
    log.info(
      `Publishing transaction data of transactionId: ${transactionId} to retry transaction queue on chainId ${this.chainId}`,
    );
    await this.publishToRetryTransactionQueue({
      relayerAddress,
      transactionType,
      transactionHash: transactionExecutionResponse.hash,
      transactionId,
      rawTransaction: rawTransaction as EVMRawTransactionType,
      walletAddress,
      metaData,
      relayerManagerName,
      event: SocketEventType.onTransactionHashGenerated,
    });

    // wait for transaction
    this.waitForTransaction(notifyTransactionListenerParams);

    return {
      isTransactionRelayed: true,
      transactionExecutionResponse,
    };
  }

  private getCCMPTaskManagerInstance = async (
    ccmpMessage: CCMPMessage,
  ): Promise<ICCMPTaskManager> => {
    const sourceChainId = parseInt(ccmpMessage.sourceChainId.toString(), 10);
    const state = await this.crossChainTransactionDAO.getByTransactionId(
      sourceChainId,
      ccmpMessage.hash,
    );
    if (!state) {
      throw new Error(
        `No state found for transactionId: ${ccmpMessage.hash} on chainId ${sourceChainId}`,
      );
    }
    return new CCMPTaskManager(
      this.crossChainTransactionDAO,
      this.crossChainRetryHandlerQueueMap[sourceChainId],
      state.sourceTransactionHash,
      sourceChainId,
      state.message,
    );
  };

  private static handleCCMPOnTransactionSuccessFactory = (destinationTxHash?: string)
  : ICrossChainProcessStep => {
    const handler: ICrossChainProcessStep = async (data) => ({
      ...data,
      status: CrossChainTransationStatus.DESTINATION_TRANSACTION_CONFIRMED,
      context: {
        destinationTxHash,
      },
    });
    return handler;
  };

  private static handleCCMPOnTransactionFailureFactory = (
    destinationTxHash?: string,
    error?: string,
  ): ICrossChainProcessStep => {
    const handler: ICrossChainProcessStep = async (data) => ({
      ...data,
      status: CrossChainTransactionError.DESTINATION_TRANSACTION_REVERTED,
      scheduleRetry: true,
      context: {
        destinationTxHash,
        error,
      },
    });
    return handler;
  };
}
