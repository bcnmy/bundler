import { AATransactionMessageType, SCWTransactionMessageType } from '../../../../common/interface';

type RelayService = {
  code: number;
  transactionId: string;
};

type Error = {
  code: number;
  error: string;
};

export type RelayServiceResponse = RelayService | Error;

interface IRelayService<TransactionMessageType> {
  sendTransactionToRelayer(arg0: TransactionMessageType): Promise<RelayServiceResponse>;
}

export interface IAARelayService extends IRelayService<AATransactionMessageType> {}

export interface ISCWRelayService extends IRelayService<SCWTransactionMessageType> {}
