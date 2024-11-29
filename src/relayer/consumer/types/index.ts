import { ICacheService } from "../../../common/cache";
import { IQueue } from "../../../common/queue";
import {
  SendUserOperation,
  EntryPointMapType,
  EntryPointV07MapType,
  EVMRawTransactionType,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { IRelayerManager } from "../../relayer-manager";
import { ITransactionService } from "../../transaction-service";

export type BundlerConsumerParamsType = {
  queue: IQueue<SendUserOperation>;
  relayerManager: IRelayerManager<IEVMAccount, EVMRawTransactionType>;
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  cacheService: ICacheService;
  options: {
    chainId: number;
    entryPointMap: EntryPointMapType;
    entryPointMapV07: EntryPointV07MapType;
  };
};
