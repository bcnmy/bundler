import { EVMAccount } from '../../../relayer/src/services/account';
import { ICacheService } from '../../cache';
import { INetworkService } from '../../network';
import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../../types';
import { GasPriceType } from '../types';

// TODO // DO we differentiate Gas price interface on EVM/Non EVM
export interface IGasPrice {
  chainId: number;
  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;
  cacheService: ICacheService;

  setGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getGasPrice(gasType?: GasPriceType): Promise<NetworkBasedGasPriceType>

  setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxFeeGasPrice(gasType: GasPriceType): Promise<string>

  setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string>

  getBumpedUpGasPrice(
    pastGasPrice: NetworkBasedGasPriceType,
    bumpingPercentage: number
  ): NetworkBasedGasPriceType
}
