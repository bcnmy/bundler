import { ICacheService } from "../../../common/cache";
import { IUserOperationDAO, IUserOperationStateDAO } from "../../../common/db";
import { EntryPointMap } from "../../../common/types";
import { INetworkService } from "../../network";
import { NotifyTransactionListenerParamsType } from "../types";

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  userOperationDao: IUserOperationDAO;
  userOperationStateDao: IUserOperationStateDAO;
  entryPointMap: EntryPointMap;
  cacheService: ICacheService;

  notify(
    notifyTransactionListenerParams: NotifyTransactionListenerParamsType,
  ): Promise<boolean>;
}
