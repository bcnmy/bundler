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

export type GasPriceServiceType =
MaticGasPrice
| GoerliGasPrice
| MumbaiGasPrice
| EthGasPrice
| BSCTestnetGasPrice
| PolygonZKEvmTestnetGasPrice
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
      case 1442:
        return new PolygonZKEvmTestnetGasPrice(
          this.cacheService,
          this.networkService,
          this.options,
        );
      default:
        return undefined;
    }
  }
}
