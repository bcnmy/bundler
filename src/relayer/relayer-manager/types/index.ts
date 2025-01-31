import { ICacheService } from "../../../common/cache";
import { IGasPriceService } from "../../../common/gas-price";
import { INetworkService } from "../../../common/network";
import {
  EVMRawTransactionType,
  EVMRelayerMetaDataType,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { INonceManager } from "../../nonce-manager";
import { IRelayerQueue } from "../../relayer-queue";
import { ITransactionService } from "../../transaction-service";

export type EVMRelayerManagerServiceParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType>;
  relayerQueue: IRelayerQueue<EVMRelayerMetaDataType>;
  options: {
    name: string;
    chainId: number;
    relayerSeed: string;
    minRelayerCount: number;
    maxRelayerCount: number;
    inactiveRelayerCountThreshold: number;
    pendingTransactionCountThreshold: number;
    newRelayerInstanceCount: number;
    fundingBalanceThreshold: bigint;
    fundingRelayerAmount: number;
    gasLimitMap: {
      [key: number]: number;
    };
    ownerAccountDetails: IEVMAccount;
  };
};
