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

  public destinationTxHash?: string | undefined;

  constructor(
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
    public readonly sourceTxHash: string,
    public readonly sourceChainId: number,
    public readonly message: CCMPMessage,
    public readonly executionIndex: number,
    private readonly dbState: ICrossChainTransaction | null
  ) {
    // Load State from DB, create if not present
    this.logs =
      dbState && executionIndex <= dbState?.statusLog.length
        ? dbState?.statusLog[executionIndex - 1].logs
        : [{ status: CrossChainTransationStatus.__START, timestamp: Date.now() }];
  }

  setVerificationData(data: CCMPVerificationData) {
    this.verificationData = data;
  }

  setDestinationTxHash(txHash: string) {
    this.destinationTxHash = txHash;
  }

  private getUpdatedDAO() {
    let statusLog = [...(this.dbState?.statusLog || [])];
    if (this.executionIndex <= statusLog.length) {
      statusLog[this.executionIndex - 1] = {
        executionIndex: this.executionIndex,
        sourceTxHash: this.sourceTxHash,
        logs: this.logs as any,
      };
    } else {
      statusLog = [
        ...statusLog,
        {
          executionIndex: this.executionIndex,
          sourceTxHash: this.sourceTxHash,
          logs: this.logs as any,
        },
      ];
    }
    return {
      transactionId: this.message.hash,
      sourceTransactionHash: this.sourceTxHash,
      statusLog,
      creationTime: this.dbState?.creationTime || Date.now(),
      updationTime: Date.now(),
      message: this.message,
      verificationData: this.verificationData?.toString(),
      destinationTxHash: this.destinationTxHash,
    };
  }

  async run(
    name: string,
    handler: IHandler,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus
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
      updatedDao
    );
    log.info(`Updated state saved for ${name} handler to DB`);
    return this;
  }
}
