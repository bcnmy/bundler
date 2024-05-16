import { ICacheService } from "../../../common/cache";
import { IGasPriceService } from "../../../common/gas-price";
import { INetworkService } from "../../network";
import { INonceManager } from "../../nonce-manager";
import { EVMRelayerMetaDataType, IRelayerQueue } from "../../relayer-queue";
import { ITransactionService } from "../../transaction-service";

export interface IRelayerManager<AccountType, RawTransactionType> {
  chainId: number;
  transactionService: ITransactionService<AccountType, RawTransactionType>;
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
  addActiveRelayer(address: string): Promise<void>;
  postTransactionMined(address: string): Promise<void>;
  hasBalanceBelowThreshold(address: string): boolean;
  fundAndAddRelayerToActiveQueue(address: string): Promise<void>;
}
