import { IQueue } from '../../../../../common/interface';

export interface ITransactionPublisher<TransactionMessageType> {
  transactionQueue: IQueue<TransactionMessageType>;

  retryTransactionQueue: IQueue<TransactionMessageType>;

  publishToTransactionQueue(data: TransactionMessageType): Promise<boolean>;
  publishToRetryTransactionQueue(data: TransactionMessageType): Promise<boolean>;
}
