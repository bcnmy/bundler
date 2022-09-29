import { IGasPrice } from '../../../../../common/gas-price';
import { INetworkService } from '../../../../../common/network';
import { EVMRawTransactionType } from '../../../../../common/types';
import { EVMAccount, IEVMAccount } from '../../account';
import { INonceManager } from '../../nonce-manager';
import { ITransactionService } from '../../transaction-service';
import { EVMRelayerDataType } from '../types';

export interface IRelayerManager<AccountType> {
  name: string;
  chainId: number;
  transactionService: ITransactionService<EVMAccount>;
  minRelayerCount: number;
  maxRelayerCount: number;
  inactiveRelayerCountThreshold: number;
  pendingTransactionCountThreshold: number;
  newRelayerInstanceCount: number;
  fundingBalanceThreshold: number;
  fundingRelayerAmount: number;
  ownerAccountDetails: {
    [key: number]: {
      publicKey: string,
      privateKey: string,
    }
  };
  activeRelayerData: Array<EVMRelayerDataType>;
  relayerMap: Record<string, EVMAccount>;
  processingTransactionRelayerDataMap: Record<string, EVMRelayerDataType>;
  nonceManager: INonceManager;
  networkService: INetworkService<IEVMAccount<EVMRawTransactionType>, EVMRawTransactionType>;
  gasPriceService: IGasPrice;

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
