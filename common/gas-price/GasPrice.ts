import { config } from '../service-manager';
import { MaticGasPrice } from './networks/MaticGasPrice';
import { GoerliGasPrice } from './networks/GoerliGasPrice';
import { MumbaiGasPrice } from './networks/MumbaiGasPrice';
import { IGasPrice } from './interface/IGasPrice';

type GasPriceType = MaticGasPrice | GoerliGasPrice | MumbaiGasPrice | undefined;
export class GasPrice implements IGasPrice<GasPriceType> {
  chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
    this.setup();
  }

  setup = () => {
    const updateFrequencyInSeconds = config?.gasPrice.updateFrequencyInSeconds[this.chainId] || 60;
    switch (this.chainId) {
      case 137:
        return new MaticGasPrice(this.chainId, updateFrequencyInSeconds);
      case 5:
        return new GoerliGasPrice(this.chainId, updateFrequencyInSeconds);
      case 80001:
        return new MumbaiGasPrice(this.chainId, updateFrequencyInSeconds);
      default:
        return undefined;
    }
  };
}
