export interface IRelayerManager<AccountType> {
  chainId: number;

  createRelayers(numberOfRelayers: number): Promise<void>;
  fundRelayers(ownerAccount: AccountType, accountAddress: string[]): Promise<boolean>;
  getActiveRelayer(): AccountType | null;
  addActiveRelayer(address: string): void;
  getRelayersCount(active: boolean): number;
  setMinRelayerCount(minRelayerCount: number): void
  setMaxRelayerCount(maxRelayerCount: number): void
  setInactiveRelayerCountThreshold(inactiveRelayerCountThreshold: number): void
  setPendingTransactionCountThreshold(pendingTransactionCountThreshold: number): void
}
