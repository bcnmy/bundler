import { STATUSES } from '../../server/src/middleware';
import { IQueue } from '../interface';
import { logger } from '../log-config';
import {
  FallbackGasTankDepositTransactionMessageType, RelayServiceResponseType,
} from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class FallbackGasTankDepositRelayService implements IRelayService<
FallbackGasTankDepositTransactionMessageType> {
  queue: IQueue<FallbackGasTankDepositTransactionMessageType>;

  constructor(queue: IQueue<FallbackGasTankDepositTransactionMessageType>) {
    this.queue = queue;
  }

  /**
   * Publishes the transaction to the queue
   * @param data raw transaction data received in the request
   * @returns transaction id
   */
  async sendTransactionToRelayer(
    data: FallbackGasTankDepositTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to Fallback GasTank Deposit tranasction queue with transactionId: ${data.transactionId}`);
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
