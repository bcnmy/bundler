import { ICacheService } from '../cache';
import { IGasPriceManager } from './interface/IGasPriceManager';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';

type GasPriceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
export class GasPriceManager implements IGasPriceManager<GasPriceType> {
  chainId: number;

  redisClient: ICacheService;

  constructor(chainId: number, redisClient: ICacheService) {
    this.chainId = chainId;
    this.redisClient = redisClient;
  }

  setup() {
    switch (this.chainId) {
      case 137:
        return new MaticGasPrice(this.chainId, this.redisClient);
      case 5:
        return new GoerliGasPrice(this.chainId, this.redisClient);
      case 80001:
        return new MumbaiGasPrice(this.chainId, this.redisClient);
      default:
        return undefined;
    }
  }
}
