export interface ITransactionPublisher<TransactionMessageType> {
    queue: IQueue;

    publish(TransactionMessageType)
}