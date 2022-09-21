import { RelayServiceResponseType } from '../../../../common/types';

export interface IRelayService<TransactionMessageType> {
  sendTransactionToRelayer(data: TransactionMessageType): Promise<RelayServiceResponseType>;
}
