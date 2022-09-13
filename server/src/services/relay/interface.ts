import { AATransactionMessageType, SCWTransactionMessageType } from '../../../../common/interface';

type ResponseType = {
  code: number;
  transactionId: string;
};

type ErrorType = {
  code: number;
  error: string;
};

export function isError<T>(
  response: T | ErrorType,
): response is ErrorType {
  return (response as ErrorType).error !== undefined;
}

export type RelayServiceResponseType = ResponseType | ErrorType;

interface IRelayService<TransactionMessageType> {
  sendTransactionToRelayer(arg0: TransactionMessageType): Promise<RelayServiceResponseType>;
}

export interface IAARelayService extends IRelayService<AATransactionMessageType> {}

export interface ISCWRelayService extends IRelayService<SCWTransactionMessageType> {}
