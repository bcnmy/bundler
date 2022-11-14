import { ConsumeMessage } from 'amqplib';
import { IQueue } from '../../common/interface';
import { logger } from '../../common/log-config';
import { CrossChainRetryQueueData } from '../../common/queue/types';
import { ICrossChainTransactionHandlerService } from '../task-manager/types';
import { IRetryTransactionService } from './interface/IRetryTransactionService';

const log = logger(module);
export class CrossChainRetryTransactionService implements IRetryTransactionService {
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
