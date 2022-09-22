import {
  AATransactionMessageType, RelayServiceResponseType, IQueue,
} from '../types';
import { IRelayService } from './interface/IRelayService';

export class AARelayService implements IRelayService<AATransactionMessageType> {
  queue: IQueue<AATransactionMessageType>;

  constructor(queue: IQueue<AATransactionMessageType>) {
    this.queue = queue;
  }

  async sendTransactionToRelayer(
    data: AATransactionMessageType,
  ): Promise<RelayServiceResponseType> {
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
