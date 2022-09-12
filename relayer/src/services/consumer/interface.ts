export type TransactionResponse = {
  success: boolean,
  data?: object,
  error: string,
}

export interface IConsumer {
  connectToQueue(queueUrl: string): Promise<void>;
  fetchRelayerFromRelayerManager(chainId: number, transactionType: string): Promise<IRelayer>
  sendTransactionToTransactionManager(
    relayer: IRelayer,
    transactionData: ITransactionData
  ): Promise<TransactionResponse>
}
