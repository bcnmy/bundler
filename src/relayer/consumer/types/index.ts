import { ICacheService } from "../../../common/cache";
import { IQueue } from "../../../common/queue";
import {
  BundlerTransactionMessageType,
  BundlerV3TransactionMessageType,
  EntryPointMapType,
  EntryPointV07MapType,
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
  options: {
    chainId: number;
    entryPointMap: EntryPointMapType;
  };
};

export type BundlerV3ConsumerParamsType = {
  queue: IQueue<BundlerV3TransactionMessageType>;
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  cacheService: ICacheService;
  options: {
    chainId: number;
    entryPointMap: EntryPointV07MapType;
  };
};