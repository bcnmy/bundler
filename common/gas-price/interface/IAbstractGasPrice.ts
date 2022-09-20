import { EVMAccount } from '../../../relayer/src/services/account/EVMAccount';
import { INetworkService } from '../../network';
import { EVMRawTransactionType } from '../../types';
import { GasPriceType } from '../types';

export interface IAbstractGasPrice {
  chainId: number;
  networkService?: INetworkService<EVMAccount, EVMRawTransactionType>;

  setGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getGasPrice(gasType: GasPriceType): Promise<string>

  setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxFeeGasPrice(gasType: GasPriceType): Promise<string>

  setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void>
  getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string>

}
