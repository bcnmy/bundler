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
import { BSCGasPrice } from './networks/BSCGasPrice';
import { PolygonZKEvmGasPrice } from './networks/PolygonZKEvmGasPrice';
import { ArbOneMainnetGasPrice } from './networks/ArbOneMainnetGasPrice';
import { ArbNovaMainnetGasPrice } from './networks/ArbNovaMainnetGasPrice';

export type GasPriceServiceType =
MaticGasPrice
| GoerliGasPrice
| MumbaiGasPrice
| EthGasPrice
| BSCTestnetGasPrice
| BSCGasPrice
| PolygonZKEvmTestnetGasPrice
| ArbGoerliTestnetGasPrice
| PolygonZKEvmGasPrice
| ArbOneMainnetGasPrice
| ArbNovaMainnetGasPrice
| undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceServiceType> {
  cacheService: ICacheService;

  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>;

  options: {
    chainId: number,
    EIP1559SupportedNetworks: Array<number>
  };

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
    options: {
      chainId: number,
      EIP1559SupportedNetworks: Array<number>
    },
  ) {
    this.networkService = networkService;
    this.cacheService = cacheService;
    this.options = options;
  }

  setup() {
    switch (this.options.chainId) {
      case 1:
        return new EthGasPrice(this.cacheService, this.networkService, this.options);
      case 137:
        return new MaticGasPrice(this.cacheService, this.networkService, this.options);
      case 5:
        return new GoerliGasPrice(this.cacheService, this.networkService, this.options);
      case 80001:
        return new MumbaiGasPrice(this.cacheService, this.networkService, this.options);
      case 97:
        return new BSCTestnetGasPrice(this.cacheService, this.networkService, this.options);
      case 56:
        return new BSCGasPrice(this.cacheService, this.networkService, this.options);
      case 1442:
        return new PolygonZKEvmTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      case 1101:
        return new PolygonZKEvmGasPrice(
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
      default:
        return undefined;
    }
  }
}
