import { SCWTransactionMessageType } from '../../../../common/types';
import { IRelayService, RelayServiceResponseType } from './interface';

export class SCWRelayService implements IRelayService<SCWTransactionMessageType> {
  transactionId: string;

  constructor(transactionId: string) {
    this.transactionId = transactionId;
  }

  async sendTransactionToRelayer(
    data: SCWTransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    console.log(data);
    const response: RelayServiceResponseType = {
      code: 200,
      transactionId: this.transactionId,
    };
    return response;
  }
}
