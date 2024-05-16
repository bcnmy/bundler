import { ICacheService } from "../../../common/cache";
import { IGasPriceService } from "../../../common/gas-price";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types";
import { INetworkService } from "../../network";
import { INonceManager } from "../../nonce-manager";
import { ITransactionListener } from "../../transaction-listener";

export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;

  relayTransaction(
    partialRawTransaction: Partial<
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    transactionId: string,
    account: AccountType,
  ): Promise<void>;
  retryTransaction(
    partialRawTransaction: Partial<
      EVM1559RawTransaction | EVMLegacyRawTransaction
    >,
    transactionId: string,
    account: AccountType,
    previousTransactionHash: `0x${string}`
  ): Promise<void>;
}
