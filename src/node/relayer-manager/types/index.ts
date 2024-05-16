import { ICacheService } from "../../../common/cache";
import { IGasPriceService } from "../../../common/gas-price";
import { INotificationManager } from "../../../common/notification/interface";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { INetworkService } from "../../network";
import { INonceManager } from "../../nonce-manager";
import { EVMRelayerMetaDataType, IRelayerQueue } from "../../relayer-queue";
import { ITransactionService } from "../../transaction-service";

export type EVMRelayerManagerServiceParamsType = {
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;
  transactionService: ITransactionService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  nonceManager: INonceManager<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>;
  notificationManager: INotificationManager;
};
