import { RelayServiceResponseType } from "../../types";

export interface IRelayService<TransactionMessageType> {
  sendUserOperation(
    data: TransactionMessageType,
  ): Promise<RelayServiceResponseType>;
}
