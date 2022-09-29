import { ICacheService } from '../cache';
import { IGasPriceManager } from './interface/IGasPriceManager';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';

type GasPriceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceType> {
  chainId: number;

  cacheService: ICacheService;

  constructor(cacheService: ICacheService, options: {
    chainId: number,
  }) {
    this.cacheService = cacheService;
    this.chainId = options.chainId;
  }

  setup() {
    switch (this.chainId) {
      case 137:
        return new MaticGasPrice(this.chainId, this.cacheService);
      case 5:
        return new GoerliGasPrice(this.chainId, this.cacheService);
      case 80001:
        return new MumbaiGasPrice(this.chainId, this.cacheService);
      default:
        return new MaticGasPrice(this.chainId, this.cacheService);
    }
  }
}
