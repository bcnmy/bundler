import { ICacheService } from "../../../common/cache";
import { IMonitoringService } from "../../../common/monitoring/interface";
import { IQueue } from "../../../common/queue";
import {
  BundlerTransactionMessageType,
  EntryPointMapType,
  EVMRawTransactionType,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { IRelayerManager } from "../../relayer-manager";
import { ITransactionService } from "../../transaction-service";

export type BundlerConsumerParamsType = {
  queue: IQueue<BundlerTransactionMessageType>;
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  cacheService: ICacheService;
  monitoringService: IMonitoringService;
  options: {
    chainId: number;
    entryPointMap: EntryPointMapType;
  };
};
