import { IAARelayService, RelayServiceResponse } from './interface';

export class AARelayService implements IAARelayService {
  transactionId: string;

  constructor(transactionId: string) {
    this.transactionId = transactionId;
  }

  async sendTransactionToRelayer(): Promise<RelayServiceResponse> {
    const response: RelayServiceResponse = {
      code: 200,
      transactionId: this.transactionId,
    };
    return response;
  }
}
