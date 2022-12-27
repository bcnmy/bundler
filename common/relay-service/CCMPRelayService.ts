import { StatusCodes } from 'http-status-codes';
import { IQueue } from '../interface';
import { logger } from '../log-config';
import { CrossChainTransactionMessageType, RelayServiceResponseType } from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class CCMPRelayService implements IRelayService<CrossChainTransactionMessageType> {
  queue: IQueue<CrossChainTransactionMessageType>;

  constructor(queue: IQueue<CrossChainTransactionMessageType>) {
    this.queue = queue;
  }

  async sendTransactionToRelayer(
    data: CrossChainTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to CCMP queue with transactionId: ${data.transactionId}, chainId: ${data.chainId}`);
    await this.queue.publish(data);
    let response : RelayServiceResponseType;
    try {
      response = {
        code: StatusCodes.OK,
        transactionId: data.transactionId,
      };
    } catch (error) {
      response = {
        code: StatusCodes.BAD_REQUEST,
        error: 'bad request',
      };
    }
    return response;
  }
}
