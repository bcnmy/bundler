import type { ConsumeMessage } from 'amqplib';
import type { IQueue } from '../../common/interface';
import { logger } from '../../common/log-config';
import type { CrossChainRetryQueueData } from '../../common/queue/types';
import type { ICrossChainTransactionHandlerService } from '../transaction-handler/interfaces/ICrossChainTransactionHandlerService';
import type { ICrossChainRetryTransactionService } from './interface/IRetryTransactionService';

const log = logger(module);
export class CrossChainRetryTransactionService implements ICrossChainRetryTransactionService {
  constructor(
    public readonly chainId: number,
    public readonly queue: IQueue<CrossChainRetryQueueData>,
    public readonly ccmpService: ICrossChainTransactionHandlerService,
  ) {}

  onMessageReceived = async (msg?: ConsumeMessage) => {
    if (msg) {
      log.info(
        `Message received from cross chain retry transction queue on chainId: ${
          this.chainId
        }: ${JSON.stringify(msg.content.toString())}`,
      );
      this.queue.ack(msg);

      const { message, sourceChainTxHash }: CrossChainRetryQueueData = JSON.parse(
        msg.content.toString(),
      );

      await this.ccmpService.processTransaction(message, sourceChainTxHash);
    } else {
      log.info(
        `Message not received on cross chain retry transaction queue on chainId: ${this.chainId}`,
      );
    }
  };
}
