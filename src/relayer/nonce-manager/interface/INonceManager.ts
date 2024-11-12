import { ICacheService } from "../../../common/cache";
import { INetworkService } from "../../../common/network";
import { IEVMAccount } from "../../account";

export interface INonceManager<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  cacheService: ICacheService;

  getNonce(relayer: IEVMAccount, pendingCount?: boolean): Promise<number>;
  getAndSetNonceFromNetwork(
    account: IEVMAccount,
    pending: boolean,
  ): Promise<number>;
  markUsed(address: string, nonce: number): Promise<void>;
  incrementNonce(address: string): Promise<boolean>;
}
