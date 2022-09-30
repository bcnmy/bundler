import { EVMAccount } from '../../relayer/src/services/account';
import { ICacheService } from '../cache';
import { INetworkService } from '../network';
import { EVMRawTransactionType } from '../types';
import { IGasPriceManager } from './interface/IGasPriceManager';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';

type GasPriceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceType> {
  cacheService: ICacheService;

  networkService: INetworkService<EVMAccount, EVMRawTransactionType>;

  options: {
    chainId: number,
    EIP1559SupportedNetworks: Array<number>
  };

  constructor(
    cacheService: ICacheService,
    networkService: INetworkService<EVMAccount, EVMRawTransactionType>,
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
      case 137:
        return new MaticGasPrice(this.cacheService, this.networkService, this.options);
      case 5:
        return new GoerliGasPrice(this.cacheService, this.networkService, this.options);
      case 80001:
        return new MumbaiGasPrice(this.cacheService, this.networkService, this.options);
      default:
        return new MaticGasPrice(this.cacheService, this.networkService, this.options);
    }
  }
}
