import { config } from '../../config';
import { ICacheService } from '../cache';
import { IGasPrice } from './interface/IGasPrice';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';

type GasPriceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
export class GasPrice implements IGasPrice<GasPriceType> {
  chainId: number;

  redisClient: ICacheService;

  constructor(chainId: number, redisClient: ICacheService) {
    this.chainId = chainId;
    this.redisClient = redisClient;
    this.setup();
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
