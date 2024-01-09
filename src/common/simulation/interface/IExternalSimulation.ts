import { ICacheService } from "../../cache";
import { IGasPrice } from "../../gas-price";

export interface IExternalSimulation {
  gasPriceService: IGasPrice;
  cacheService: ICacheService;

  simulate(simulationData: any): Promise<any>;
}
