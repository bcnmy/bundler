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

  public destinationTxHash?: string | undefined;

  public status: ICrossChainTransactionStatusLogEntry;

  public creationTime: number | undefined;

  constructor(
    private readonly crossChainTransactionDAO: ICrossChainTransactionDAO,
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

  setDestinationTxHash(txHash: string) {
    this.destinationTxHash = txHash;
  }

  private getPartialDAO() {
    return {
      status: this.status,
      transactionId: this.message.hash,
      sourceTransactionHash: this.sourceTxHash,
      creationTime: this.creationTime || Date.now(),
      updationTime: Date.now(),
      message: this.message,
      verificationData: this.verificationData?.toString(),
      destinationTxHash: this.destinationTxHash,
    };
  }

  public async getState(): Promise<ICrossChainTransaction | null> {
    return this.crossChainTransactionDAO.getByTransactionId(this.sourceChainId, this.message.hash);
  }

  async run(
    name: string,
    handler: IHandler,
    handlerExpectedPostCompletionStatus: CrossChainTransationStatus,
  ): Promise<ICCMPTaskManager> {
    let state = await this.getState();
    if (!state) {
      state = {
        ...this.getPartialDAO(),
        statusLog: [this.status],
      };
      await this.crossChainTransactionDAO.updateByTransactionId(
        this.sourceChainId,
        this.message.hash,
        state,
      );
    }

    // Remove Mongo specific fields from the result if any before assigning to this.status
    const {
      status, timestamp, context, sourceTxHash, error,
    } = state.statusLog[state.statusLog.length - 1];
    this.status = {
      status, timestamp, context, sourceTxHash, error,
    };

    // Run the Handler
    let partialStatusLog: ICrossChainTransactionStatusLogEntry;
    try {
      log.info(`Running ${name} handler`);
      partialStatusLog = await handler(this.status, this);
    } catch (e) {
      partialStatusLog = {
        ...this.status,
        status: CrossChainTransactionError.UNKNOWN_ERROR,
        context: {
          exception: JSON.stringify(e),
        },
      };
    }
    this.status = {
      ...partialStatusLog,
      timestamp: Date.now(),
      error: partialStatusLog.status !== handlerExpectedPostCompletionStatus,
    };
    log.info(`Status Log from ${name} handler is ${JSON.stringify(this.status)}`);

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
      },
    );
    log.info(`Updated state saved for ${name} handler to DB`);

    return this;
  }
}
