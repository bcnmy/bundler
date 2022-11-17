import { logger } from '../../common/log-config';
import {
  CCMPMessage,
  CrossChainTransactionError,
  CrossChainTransationStatus,
  TransactionType,
} from '../../common/types';
import type {
  ICrossChainTransaction,
  ICrossChainTransactionDAO,
  ICrossChainTransactionStatusLogEntry,
  CCMPVerificationData,
} from '../../common/db';
import { config } from '../../config';
import type { ICrossChainProcessStep } from './types';
import type { IQueue } from '../../common/interface';
import type { CrossChainRetryQueueData } from '../../common/queue/types';
import type { ICCMPTaskManager } from './interfaces/ICCMPTaskManager';

const log = logger(module);

export class CCMPTaskManager implements ICCMPTaskManager {
  public verificationData: CCMPVerificationData;

  public status: ICrossChainTransactionStatusLogEntry;

  public creationTime: number | undefined;

  private errorOccured: boolean = false;

  constructor(
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
    private readonly crossChainRetryHandlerQueue: IQueue<CrossChainRetryQueueData>,
    public readonly sourceTxHash: string,
    public readonly sourceChainId: number,
    public readonly message: CCMPMessage,
  ) {
    this.status = {
      status: CrossChainTransationStatus.__START,
      timestamp: Date.now(),
      sourceTxHash: this.sourceTxHash,
    };
  }

  setVerificationData(data: CCMPVerificationData) {
    this.verificationData = data;
  }

  private getPartialDAO() {
    return {
      status: this.status.status,
      transactionId: this.message.hash,
      sourceTransactionHash: this.sourceTxHash,
      creationTime: this.creationTime || Date.now(),
      updationTime: Date.now(),
      message: this.message,
      verificationData: this.verificationData?.toString(),
    };
  }

  private async scheuduleRetry(retryCount: number) {
    const chainId = parseInt(this.message.sourceChainId.toString(), 10);
    const maxRetryCount = config.transaction.retryCount[TransactionType.CROSS_CHAIN][chainId];
    if (!maxRetryCount) {
      log.error(`No retry count configured for chainId ${chainId}`);
      return;
    }
    if (retryCount < maxRetryCount) {
      log.info(
        `Scheduling Retry for Message hash ${this.message.hash}, current retry count is ${retryCount}`,
      );
      this.crossChainRetryHandlerQueue.publish({
        transactionId: this.message.hash,
        message: this.message,
        sourceChainTxHash: this.sourceTxHash,
        transationType: TransactionType.CROSS_CHAIN,
      });
    } else {
      log.error(`Max Retry Count ${maxRetryCount} reached for message hash ${this.message.hash}`);
    }
  }

  public async getState(): Promise<ICrossChainTransaction | null> {
    return this.crossChainTransactionDAO.getByTransactionId(this.sourceChainId, this.message.hash);
  }

  async run(
    name: string,
    handler: ICrossChainProcessStep,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus,
  ): Promise<ICCMPTaskManager> {
    if (this.errorOccured) {
      log.error(`Task Manager: ${name} - Error Occured in previous task, Skipping`);
      return this;
    }

    // Initialize the Task Manager State for this task
    let state = await this.getState();
    if (!state) {
      state = {
        ...this.getPartialDAO(),
        retryCount: 0,
        statusLog: [this.status],
      };
      await this.crossChainTransactionDAO.updateByTransactionId(
        this.sourceChainId,
        this.message.hash,
        state,
      );
    }

    {
      // Remove Mongo specific fields from the result if any before assigning to this.status
      const {
        status, timestamp, context, sourceTxHash, error, scheduleRetry,
      } = state.statusLog[state.statusLog.length - 1];
      this.status = {
        status,
        timestamp,
        context,
        sourceTxHash,
        error,
        scheduleRetry,
      };
    }

    // Run the Handler
    let partialStatusLog: ICrossChainTransactionStatusLogEntry;
    try {
      log.info(`Running ${name} handler`);
      partialStatusLog = await handler(this.status, this);
    } catch (e) {
      log.error(`Error in ${name} handler`, e);
      partialStatusLog = {
        ...this.status,
        // If an exception occurs in the handler, we should send the message to be retried
        scheduleRetry: true,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          exception: JSON.stringify(e),
        },
      };
    }
    // Prevent Subsequent Steps from Running if an Error Occurs
    this.errorOccured = partialStatusLog.status !== handlerExpectedPostCompletionStatus;

    this.status = {
      ...partialStatusLog,
      timestamp: Date.now(),
      error: this.errorOccured,
    };
    log.info(`Status Log from ${name} handler is ${JSON.stringify(this.status)}`);

    // Send the message to be retried if required
    if (this.status.scheduleRetry) {
      await this.scheuduleRetry(state.retryCount);
    }

    // Update state in DB
    log.info(`Saving updated state for ${name} handler to DB...`);
    const updatedDao = this.getPartialDAO();
    await this.crossChainTransactionDAO.updateByTransactionId(
      this.sourceChainId,
      updatedDao.transactionId,
      {
        $set: updatedDao,
        $push: {
          statusLog: this.status,
        },
        ...(this.status.scheduleRetry && {
          $inc: {
            retryCount: 1,
          },
        }),
      },
    );
    log.info(`Updated state saved for ${name} handler to DB`);

    return this;
  }
}
