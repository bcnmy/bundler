import { GoerliGasPrice } from '../networks/GoerliGasPrice';
import { MaticGasPrice } from '../networks/MaticGasPrice';
import { MumbaiGasPrice } from '../networks/MumbaiGasPrice';

export enum GasPriceType {
  DEFAULT = 'default',
  MEDIUM = 'medium',
  FAST = 'fast',
}

export type GasPriceServiceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
