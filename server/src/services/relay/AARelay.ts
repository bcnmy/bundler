import { IQueue } from '../../../../common/queue';
import { queueMap } from '../../../../common/service-manager';
import { AATransactionMessageType, TransactionType } from '../../../../common/types';
import { IRelayService, RelayServiceResponseType } from './interface';

export class AARelayService implements IRelayService<AATransactionMessageType> {
  transactionId: string;

  constructor(transactionId: string) {
    this.transactionId = transactionId;
  }

  async sendTransactionToRelayer(
    data: AATransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    const publisher: IQueue<AATransactionMessageType> = queueMap[data.chainId][TransactionType.AA];
    await publisher.publish(data);
    let response : RelayServiceResponseType;
    try {
      response = {
        code: 200,
        transactionId: this.transactionId,
      };
    } catch (error) {
      console.log(error);
      response = {
        code: 400,
        error: 'bad request',
      };
    }
    return response;
  }
}
