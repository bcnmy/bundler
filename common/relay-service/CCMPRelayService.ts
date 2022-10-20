import { IQueue } from '../interface';
import { logger } from '../log-config';
import { CCMPTransactionMessageType, RelayServiceResponseType } from '../types';
import { IRelayService } from './interface/IRelayService';

const log = logger(module);
export class CCMPRelayService implements IRelayService<CCMPTransactionMessageType> {
  queue: IQueue<CCMPTransactionMessageType>;

  constructor(queue: IQueue<CCMPTransactionMessageType>) {
    this.queue = queue;
  }

  async sendTransactionToRelayer(
    data: CCMPTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    log.info(`Sending transaction to CCMP queue with transactionId: ${data.transactionId}, chainId: ${data.chainId}`);
    await this.queue.publish(data);
    let response : RelayServiceResponseType;
    try {
      response = {
        code: 200,
        transactionId: data.transactionId,
      };
    } catch (error) {
      response = {
        code: 400,
        error: 'bad request',
      };
    }
    return response;
  }
}
