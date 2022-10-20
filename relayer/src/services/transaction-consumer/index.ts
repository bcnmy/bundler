interface TransactionConsumer {
  onTransactionEnqueued(): void
  relayNextTransaction(chainId: number): void
}

export { TransactionConsumer };
