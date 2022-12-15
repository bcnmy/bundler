import { IQueue } from '../interface';
import { logger } from '../log-config';
import { SCWTransactionMessageType, RelayServiceResponseType } from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class SCWRelayService implements IRelayService<SCWTransactionMessageType> {
  queue: IQueue<SCWTransactionMessageType>;

  constructor(queue: IQueue<SCWTransactionMessageType>) {
    this.queue = queue;
  }

  async sendTransactionToRelayer(
    data: SCWTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to SCW tranasction queue with transactionId: ${data.transactionId}`);
    let response : RelayServiceResponseType;
    try {
      await this.queue.publish(data);
      response = {
        code: 200,
        transactionId: data.transactionId,
      };
    } catch (error) {
      response = {
        code: 500,
        error: `Internal server error: ${error}`,
      };
    }
    return response;
  }
}
