export interface IRelayerManager<AccountType> {
  chainId: number;

  createRelayers(numberOfRelayers: number): Promise<void>;
  // TODO
  // What is fundingObject[]
  fundRelayers(ownerAccount: AccountType, accountAddress ?: string): Promise<boolean>;
  getRelayer(relayerAddress: string): Promise<AccountType>;
  getActiveRelayer(): Promise<AccountType>;
  setMinRelayerCount(minRelayerCount: number): void
  setMaxRelayerCount(maxRelayerCount: number): void
  setInactiveRelayerCountThreshold(inactiveRelayerCountThreshold: number): void
  setPendingTransactionCountThreshold(pendingTransactionCountThreshold: number): void
}
