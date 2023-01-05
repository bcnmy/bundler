import { IQueue } from '../interface';
import { logger } from '../log-config';
import {
  GaslessFallbackTransactionMessageType, RelayServiceResponseType,
} from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class GaslessFallbackRelayService
implements IRelayService<GaslessFallbackTransactionMessageType> {
  queue: IQueue<GaslessFallbackTransactionMessageType>;

  constructor(queue: IQueue<GaslessFallbackTransactionMessageType>) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendTransactionToRelayer(
    data: GaslessFallbackTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to Gasless Fallback tranasction queue with transactionId: ${data.transactionId}`);
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
