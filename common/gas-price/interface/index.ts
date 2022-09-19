import { GasPriceType } from "../types";

export interface IGasPrice {
  updateFrequencyInSeconds: number;
  setup(): void;
}

export interface IAbstractGasPrice {
  chainId: number;
  networkService: INetworkService;

  setGasPrice(chainId: number, gasType: GasPriceType, price: number): Promise<void>
  getGasPrice(chainId: number, gasType: GasPriceType): Promise<void>

  setMaxFeeGasPrice(chainId: number, gasType: GasPriceType, price: number): Promise<void>
  getMaxFeeGasPrice(chainId: number, gasType: GasPriceType): Promise<void>

  setMaxPriorityFeeGasPrice(chainId: number, gasType: GasPriceType, price: number): Promise<void>
  getMaxPriorityFeeGasPrice(chainId: number, gasType: GasPriceType): Promise<void>

}
