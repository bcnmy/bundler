import { ICacheService } from "../../../common/cache";
import { IGasPriceService } from "../../../common/gas-price";
import { INetworkService } from "../../../common/network";
import { EVMRelayerMetaDataType } from "../../../common/types";
import { INonceManager } from "../../nonce-manager";
import { IRelayerQueue } from "../../relayer-queue";
import { ITransactionService } from "../../transaction-service";

export interface IRelayerManager<AccountType, RawTransactionType> {
  name: string;
  chainId: number;
  transactionService: ITransactionService<AccountType, RawTransactionType>;
  newRelayerInstanceCount: number;
  fundingBalanceThreshold: bigint;
  fundingRelayerAmount: number;
  relayerSeed: string;
  ownerAccountDetails: AccountType;
  gasLimitMap: {
    [key: number]: number;
  };
  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>;
  relayerMap: Record<string, AccountType>;
  transactionProcessingRelayerMap: Record<string, EVMRelayerMetaDataType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  networkService: INetworkService<AccountType, RawTransactionType>;
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;
  createRelayers(numberOfRelayers?: number): Promise<string[]>;
  fundRelayers(accountAddress: string[]): Promise<boolean>;
  getActiveRelayer(): Promise<AccountType | null>;
  getRelayer(accountAddress: string): AccountType | null;
  addActiveRelayer(address: string): Promise<void>;
  postTransactionMined(address: string): Promise<void>;
  getRelayersCount(active: boolean): number;
  hasBalanceBelowThreshold(address: string): boolean;
  setMinRelayerCount(minRelayerCount: number): void;
  getMinRelayerCount(): number;
  setMaxRelayerCount(maxRelayerCount: number): void;
  getMaxRelayerCount(): number;
  setInactiveRelayerCountThreshold(inactiveRelayerCountThreshold: number): void;
  getInactiveRelayerCountThreshold(): number;
  setPendingTransactionCountThreshold(
    pendingTransactionCountThreshold: number,
  ): void;
  getPendingTransactionCountThreshold(): number;
  fundAndAddRelayerToActiveQueue(address: string): Promise<void>;
}
