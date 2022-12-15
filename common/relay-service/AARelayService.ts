import { IQueue } from '../interface';
import { logger } from '../log-config';
import {
  AATransactionMessageType, RelayServiceResponseType,
} from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class AARelayService implements IRelayService<AATransactionMessageType> {
  queue: IQueue<AATransactionMessageType>;

  constructor(queue: IQueue<AATransactionMessageType>) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendTransactionToRelayer(
    data: AATransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to AA tranasction queue with transactionId: ${data.transactionId}`);
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
