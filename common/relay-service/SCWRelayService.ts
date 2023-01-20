import { STATUSES } from '../../server/src/middleware';
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
        code: STATUSES.SUCCESS,
        transactionId: data.transactionId,
      };
    } catch (error) {
      response = {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${error}`,
      };
    }
    return response;
  }
}
