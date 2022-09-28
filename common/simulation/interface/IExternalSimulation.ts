import { IGasPrice } from '../../gas-price/interface/IGasPrice';

export interface IExternalSimulation {
  gasPriceService: IGasPrice;

  simulate(simulationData: any): Promise<any>;
}
