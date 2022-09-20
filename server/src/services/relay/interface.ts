type ResponseType = {
  code: number;
  transactionId: string;
};

type ErrorType = {
  code: number;
  error: string;
};

export type RelayServiceResponseType = ResponseType | ErrorType;

export interface IRelayService<TransactionMessageType> {
  sendTransactionToRelayer(data: TransactionMessageType): Promise<RelayServiceResponseType>;
}
