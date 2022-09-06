export interface IConsumer {
  connectToQueue(queueUrl: string): Promise<Boolean>;
  fetchRelayerFromRelayerManager(chainId: number, transactionType: string): Promise<IRelayer>
  sendTransactionToTransactionManager(
    relayer: IRelayer,
    transactionData: ITransactionData
  ): Promise<TransactionResponse>
}
