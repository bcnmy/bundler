import { ethers } from 'ethers';
import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { INonceManager } from '../../nonce-manager';
import { ITransactionService } from '../../transaction-service';
import { EVMRelayerDataType } from '../types';

export interface IRelayerManager<AccountType, RawTransactionType> {
  name: string;
  chainId: number;
  transactionService: ITransactionService<AccountType, RawTransactionType>;
  minRelayerCount: number;
  maxRelayerCount: number;
  inactiveRelayerCountThreshold: number;
  pendingTransactionCountThreshold: number;
  newRelayerInstanceCount: number;
  fundingBalanceThreshold: ethers.BigNumber;
  fundingRelayerAmount: number;
  masterSeed: string;
  ownerAccountDetails: AccountType;
  gasLimitMap: {
    [key: number]: number
  };
  activeRelayerData: Array<EVMRelayerDataType>;
  relayerMap: Record<string, AccountType>;
  processingTransactionRelayerDataMap: Record<string, EVMRelayerDataType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  networkService: INetworkService<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;

  createRelayers(numberOfRelayers?: number): Promise<string[]>;
  fundRelayers(accountAddress: string[]): Promise<boolean>;
  getActiveRelayer(): Promise<AccountType | null>;
  addActiveRelayer(address: string): void;
  getRelayersCount(active: boolean): number;
  setMinRelayerCount(minRelayerCount: number): void
  setMaxRelayerCount(maxRelayerCount: number): void
  setInactiveRelayerCountThreshold(inactiveRelayerCountThreshold: number): void
  setPendingTransactionCountThreshold(pendingTransactionCountThreshold: number): void
}
