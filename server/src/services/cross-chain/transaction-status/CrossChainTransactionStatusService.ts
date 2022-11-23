import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../../../common/log-config';
import type { Mongo } from '../../../../../common/db';
import type { ICrossChainTransactionStatusService } from './interfaces/ICrossChainTransactionStatusService';
import type { CrossChainTransactionStatusResult } from './types';
import type { EVMNetworkService } from '../../../../../common/network';
import type { CCMPGatewayService } from '../gateway';
import { CrossChainTransactionError, CrossChainTransationStatus, TransactionStatus } from '../../../../../common/types';

const log = logger(module);

export class CrosschainTransactionStatusService implements ICrossChainTransactionStatusService {
  constructor(
    private readonly dbService: Mongo,
    private readonly networkServiceMap: Record<number, EVMNetworkService>,
    private readonly ccmpGatewayService: CCMPGatewayService,
  ) {}

  async getStatusBySourceTransaction(
    sourceTxHash: string,
    chainId: number,
  ): Promise<CrossChainTransactionStatusResult> {
    try {
      log.info(`Getting status for source transaction ${sourceTxHash} on chain ${chainId}...`);
      const transactionReceipt = await this.networkServiceMap[chainId].getTransactionReceipt(
        sourceTxHash,
      );
      if (!transactionReceipt) {
        log.error(`Transaction ${sourceTxHash} not found on chain ${chainId}`);
        return {
          responseCode: StatusCodes.NOT_FOUND,
          context: `Transaction ${sourceTxHash} not found on chain ${chainId}`,
        };
      }
      const ccmpMessage = await this.ccmpGatewayService.getMessageFromSourceTransactionReceipt(
        chainId,
        transactionReceipt,
      );
      log.info(
        `CCMP message hash for source transaction ${sourceTxHash} on chainId ${chainId}: ${ccmpMessage.hash}`,
      );
      return await this.getStatusByMessageHash(ccmpMessage.hash, chainId);
    } catch (error) {
      log.error(
        `Error getting status for source transaction ${sourceTxHash} on chain ${chainId}: ${JSON.stringify(
          error,
        )}`,
      );
      return {
        responseCode: StatusCodes.INTERNAL_SERVER_ERROR,
        context: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  }

  async getStatusByMessageHash(
    messageHash: string,
    chainId: number,
  ): Promise<CrossChainTransactionStatusResult> {
    try {
      // Get Source Chain Details
      const sourceCrossChainChainDao = this.dbService.getCrossChainTransaction(chainId);
      const sourceChainData = await sourceCrossChainChainDao.findOne({ messageHash });
      if (!sourceChainData) {
        log.error(`Message ${messageHash} not found on chain ${chainId}`);
        return {
          responseCode: StatusCodes.NOT_FOUND,
          context: `Message ${messageHash} not found on chain ${chainId}`,
        };
      }
      const sourceStatus = sourceChainData.statusLog[sourceChainData.statusLog.length - 1];

      // Get destination chain details (if generated)
      const destinationChainId = parseInt(
        sourceChainData.message.destinationChainId.toString(),
        10,
      );
      const destinationChainDao = this.dbService.getBlockchainTransaction(destinationChainId);
      const destinationchainData = await destinationChainDao.findOne({
        transactionId: messageHash,
      });

      return {
        responseCode: StatusCodes.OK,
        ...(sourceChainData.errors
          ? { error: sourceStatus.status as CrossChainTransactionError }
          : { sourceTransactionStatus: sourceStatus.status as CrossChainTransationStatus }),
        context: sourceStatus.context,
        destinationTransactionStatus: destinationchainData?.status as TransactionStatus,
      };
    } catch (error) {
      log.error(`Error getting status for message hash ${messageHash}: ${JSON.stringify(error)}`);
      return {
        responseCode: StatusCodes.INTERNAL_SERVER_ERROR,
        context: error instanceof Error ? error.message : JSON.stringify(error),
      };
    }
  }
}
