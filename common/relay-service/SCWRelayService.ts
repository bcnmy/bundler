/* eslint-disable import/no-import-module-exports */
import { STATUSES } from '../../server/src/middleware';
import { IQueue } from '../interface';
import { logger } from '../logger';
import { SCWTransactionMessageType, RelayServiceResponseType } from '../types';
import { parseError } from '../utils';
import { IRelayService } from './interface/IRelayService';

const log = logger.child({ module: module.filename.split('/').slice(-4).join('/') });
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
      log.error((parseError(error)));
      response = {
        code: STATUSES.INTERNAL_SERVER_ERROR,
        error: `Internal server error: ${error}`,
      };
    }
    return response;
  }
}
