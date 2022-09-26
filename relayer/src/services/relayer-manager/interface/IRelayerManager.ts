import { RelayerMetaDataType } from '../types';

export interface IRelayerManager<AccountType> {
  chainId: number;

  createRelayers(numberOfRelayers: number): Promise<void>;
  fundRelayers(ownerAccount: AccountType, accountAddress: string[]): Promise<boolean>;
  getRelayer(relayerAddress: string): AccountType | RelayerMetaDataType;
  getActiveRelayer(): AccountType | RelayerMetaDataType;
  setMinRelayerCount(minRelayerCount: number): void
  setMaxRelayerCount(maxRelayerCount: number): void
  setInactiveRelayerCountThreshold(inactiveRelayerCountThreshold: number): void
  setPendingTransactionCountThreshold(pendingTransactionCountThreshold: number): void
}
