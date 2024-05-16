import { ICacheService } from "../../../common/cache";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
} from "../../../common/types";
import { IEVMAccount } from "../../account";
import { INetworkService } from "../../network";

export type EVMNonceManagerParamsType = {
  options: {
    nonceExpiryTTL: number;
  };
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  cacheService: ICacheService;
};
