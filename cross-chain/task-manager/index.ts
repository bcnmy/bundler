import { logger } from '../../common/log-config';
import {
  CCMPMessage,
  CrossChainTransactionError,
  CrossChainTransationStatus,
} from '../../common/types';
import type {
  ICrossChainTransaction,
  ICrossChainTransactionDAO,
  ICrossChainTransactionStatusLogEntry,
  CCMPVerificationData,
} from '../../common/db';
import type { IHandler } from './types';
import { ICCMPTaskManager } from './types';

const log = logger(module);

export class CCMPTaskManager implements ICCMPTaskManager {
  public verificationData: CCMPVerificationData;

  public logs: ICrossChainTransactionStatusLogEntry[];

  constructor(
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
    public readonly sourceTxHash: string,
    public readonly sourceChainId: number,
    public readonly message: CCMPMessage,
    private readonly lastRunState: ICrossChainTransaction | null,
  ) {
    this.logs = [{ status: CrossChainTransationStatus.__START, timestamp: Date.now() }];
  }

  setVerificationData(data: CCMPVerificationData) {
    this.verificationData = data;
  }

  private getUpdatedDAO() {
    return {
      transactionId: this.message.hash,
      sourceTransactionHash: this.sourceTxHash,
      statusLog: [
        ...(this.lastRunState?.statusLog || []),
        {
          executionIndex: (this.lastRunState?.statusLog?.length || 0) + 1,
          logs: this.logs as any,
        },
      ],
      creationTime: this.lastRunState?.creationTime || Date.now(),
      updationTime: Date.now(),
      message: this.message,
      verificationData: this.verificationData?.toString(),
    };
  }

  async run(
    name: string,
    handler: IHandler,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus,
  ): Promise<ICCMPTaskManager> {
    const latestEntry = this.logs[this.logs.length - 1];

    // If an error occured in the previous step, skip this step
    if (latestEntry.error) {
      return this;
    }

    // Run the Handler
    let partialStatusLog: ICrossChainTransactionStatusLogEntry;
    try {
      log.info(`Running ${name} handler`);
      partialStatusLog = await handler(latestEntry, this);
    } catch (e) {
      partialStatusLog = {
        ...latestEntry,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          exception: JSON.stringify(e),
        },
      };
    }
    const statusLog = {
      ...partialStatusLog,
      timestamp: Date.now(),
      error: partialStatusLog.status !== handlerExpectedPostCompletionStatus,
    };
    log.info(`Status Log from ${name} handler is ${JSON.stringify(statusLog)}`);
    this.logs.push(statusLog);

    // Update state in DB:
    log.info(`Saving updated state for ${name} handler to DB...`);
    const updatedDao = this.getUpdatedDAO();
    await this.crossChainTransactionDAO.updateByTransactionId(
      this.sourceChainId,
      updatedDao.transactionId,
      updatedDao,
    );
    log.info(`Updated state saved for ${name} handler to DB`);
    return this;
  }
}
