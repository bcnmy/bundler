import { ICacheService } from "../../../common/cache";
import { IUserOperationStateDAO } from "../../../common/db";
import { IGasPriceService } from "../../../common/gas-price";
import { INotificationManager } from "../../../common/notification/interface";
import { IEVMAccount } from "../../account";
import { INonceManager } from "../../nonce-manager";
import { ITransactionListener } from "../../transaction-listener";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types/types";
import { INetworkService } from "../../network";

export type EVMTransactionServiceParamsType = {
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  transactionListener: ITransactionListener<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  nonceManager: INonceManager<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;
  notificationManager: INotificationManager;
  userOperationStateDao: IUserOperationStateDAO;
};
