import { IEVMAccount } from "../../../node/account";
import { INetworkService } from "../../../node/network";
import { ICacheService } from "../../cache";
import {
  EVM1559RawTransaction,
  EVMLegacyRawTransaction,
  GasPriceType,
} from "../../types";

export interface IGasPriceService {
  chainId: number;
  networkService: INetworkService<
    IEVMAccount,
    EVM1559RawTransaction | EVMLegacyRawTransaction
  >;
  cacheService: ICacheService;

  setGasPrice(price: string): Promise<void>;
  getGasPrice(): Promise<GasPriceType>;

  setMaxFeeGasPrice(price: string): Promise<void>;
  getMaxFeeGasPrice(): Promise<string>;

  setMaxPriorityFeeGasPrice(price: string): Promise<void>;
  getMaxPriorityFeeGasPrice(): Promise<string>;

  getBumpedUpGasPrice(
    pastGasPrice: GasPriceType,
    bumpingPercentage: number,
  ): GasPriceType;

  setBaseFeePerGas(baseFeePerGas: string): Promise<void>;
  getBaseFeePerGas(): Promise<bigint>;

  get1559GasPrice(): Promise<{
    maxPriorityFeePerGas: bigint;
    maxFeePerGas: bigint;
  }>;
}
