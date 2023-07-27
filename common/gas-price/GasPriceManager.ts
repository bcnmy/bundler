import { IEVMAccount } from '../../relayer/src/services/account';
import { ICacheService } from '../cache';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { IGasPriceManager } from './interface/IGasPriceManager';
import { BSCTestnetGasPrice } from './networks/BSCTestnetGasPrice';
import { EthGasPrice } from './networks/EthGasPrice';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';
import { PolygonZKEvmTestnetGasPrice } from './networks/PolygonZKEvmTestnetGasPrice';
import { ArbGoerliTestnetGasPrice } from './networks/ArbGoerliTestnetGasPrice';
import { BSCMainnetGasPrice } from './networks/BSCMainnetGasPrice';
import { PolygonZKEvmMainnetGasPrice } from './networks/PolygonZKEvmMainnetGasPrice';
import { ArbOneMainnetGasPrice } from './networks/ArbOneMainnetGasPrice';
import { ArbNovaMainnetGasPrice } from './networks/ArbNovaMainnetGasPrice';
import { OptimismGoerliGasPrice } from './networks/OptimismGoerliGasPrice';
import { AvalanceTestnetGasPrice } from './networks/AvalanceTestnetGasPrice';
import { BaseGoerliGasPrice } from './networks/BaseGoerliGasPrice';
import { BaseMainnetGasPrice } from './networks/BaseMainnetGasPrice';
import { LineaTestnetGasPrice } from './networks/LineaTestnetGasPrice';
import { LineaMainnetGasPrice } from './networks/LineaMainnetGasPrice';
import { OptimismMainnetGasPrice } from './networks/OptimismMainnetGasPrice';
import { AvalanceMainnetGasPrice } from './networks/AvalanceMainnetGasPrice';
import { MoonbaseAlphaTestnetGasPrice } from './networks/MoonbaseAlphaTestnetGasPrice';
import { MoonbeamMainnetGasPrice } from './networks/MoonbeamMainnetGasPrice';

export type GasPriceServiceType =
  | MaticGasPrice
  | GoerliGasPrice
  | MumbaiGasPrice
  | EthGasPrice
  | BSCTestnetGasPrice
  | BSCMainnetGasPrice
  | PolygonZKEvmTestnetGasPrice
  | ArbGoerliTestnetGasPrice
  | PolygonZKEvmMainnetGasPrice
  | ArbOneMainnetGasPrice
  | ArbNovaMainnetGasPrice
  | OptimismGoerliGasPrice
  | OptimismMainnetGasPrice
  | AvalanceTestnetGasPrice
  | AvalanceMainnetGasPrice
  | BaseGoerliGasPrice
  | BaseMainnetGasPrice
  | LineaTestnetGasPrice
  | LineaMainnetGasPrice
  | MoonbaseAlphaTestnetGasPrice
  | MoonbeamMainnetGasPrice
  | undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceServiceType> {
  cacheService: ICacheService;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  options: {
    chainId: number;
    EIP1559SupportedNetworks: Array<number>;
  };

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number;
      EIP1559SupportedNetworks: Array<number>;
    },
  ) {
    this.networkService = networkService;
    this.cacheService = cacheService;
    this.options = options;
  }

  setup() {
    switch (this.options.chainId) {
      case 1:
        return new EthGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 137:
        return new MaticGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 5:
        return new GoerliGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 80001:
        return new MumbaiGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 97:
        return new BSCTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 56:
        return new BSCMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 1442:
        return new PolygonZKEvmTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 1101:
        return new PolygonZKEvmMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 421613:
        return new ArbGoerliTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 42161:
        return new ArbOneMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 42170:
        return new ArbNovaMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 420:
        return new OptimismGoerliGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 10:
        return new OptimismMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 43113:
        return new AvalanceTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 43114:
        return new AvalanceMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 84531:
        return new BaseGoerliGasPrice(
          this.cacheService,
          this.networkService,
          this.options
        );
      case 8453:
        return new BaseMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options
        );
      case 59140:
        return new LineaTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 59144:
        return new LineaMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 1287:
        return new MoonbaseAlphaTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 1284:
        return new MoonbeamMainnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      default:
        return undefined;
    }
  }
}
