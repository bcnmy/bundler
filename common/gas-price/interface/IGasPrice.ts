import { EVMAccount } from '../../../relayer/src/services/account/EVMAccount';
import { INetworkService } from '../../network';
import { EVMRawTransactionType, NetworkBasedGasPriceType } from '../../types';
import { GasPriceType } from '../types';

export interface IGasPrice {
  chainId: number;
  networkService?: INetworkService<EVMAccount, EVMRawTransactionType>;

  setGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getGasPrice(gasType?: GasPriceType): Promise<NetworkBasedGasPriceType>

  setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxFeeGasPrice(gasType: GasPriceType): Promise<string>

  setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string>

}
