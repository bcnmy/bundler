type RelayService = {
  code: number;
  transactionId: string;
};

type Error = {
  code: number;
  error: string;
};

export type RelayServiceResponse = RelayService | Error;

interface IRelayService {
  sendTransactionToRelayer(): Promise<RelayServiceResponse>;
}

export interface IAARelayService extends IRelayService {}

export interface ISCWRelayService extends IRelayService {}
