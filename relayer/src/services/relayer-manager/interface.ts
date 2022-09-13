export interface IRelayerManager<AccountType> {
  chainId: number;

  createRelayers(numberOfRelayers: number): Promise<void>;
  // TODO
  // What is fundingObject[]
  fundRelayers(ownerAccount: AccountType, accountAddress ?: string): Promise<boolean>;
  getRelayer(relayerAddress: string): Promise<AccountType>;
  getActiveRelayer(): Promise<AccountType>;
  setMinRelayerCount(): Promise<boolean>
  setMaxRelayerCount(): Promise<boolean>
  setInactiveRelayerCountThreshold(): Promise<boolean>
  setPendingTransactionCountThreshold(): Promise<boolean>
}
