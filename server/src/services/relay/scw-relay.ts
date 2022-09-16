import { AATransactionMessageType } from "../../../../common/types";
import { IAARelayService, RelayServiceResponseType } from "./interface";

export class AARelayService implements IAARelayService {
  transactionId: string;

  constructor(transactionId: string) {
    this.transactionId = transactionId;
  }

  async sendTransactionToRelayer(
    data: AATransactionMessageType,
  ): Promise<RelayServiceResponseType> {
    console.log(data);
    const response: RelayServiceResponseType = {
      code: 200,
      transactionId: this.transactionId,
    };
    return response;
  }
}
