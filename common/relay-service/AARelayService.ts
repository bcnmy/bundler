/* eslint-disable import/no-import-module-exports */
import { STATUSES } from '../../server/src/middleware';
import { IQueue } from '../interface';
import { logger } from '../logger';
import {
  AATransactionMessageType, RelayServiceResponseType,
} from '../types';
import { parseError } from '../utils';
import { IRelayService } from './interface/IRelayService';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });
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
    log.info(`Sending transaction to AA transaction queue with transactionId: ${data.transactionId}`);
    let response : RelayServiceResponseType;
    try {
      await this.queue.publish(data);
      response = {
        code: STATUSES.SUCCESS,
        transactionId: data.transactionId,
      };
    } catch (error) {
      log.error((parseError(error)));
      response = {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${error}`,
      };
    }
    return response;
  }
}
