import { ICacheService } from "../../cache";
import { IGasPriceService } from "../../gas-price";

export interface IExternalSimulation {
  gasPriceService: IGasPriceService;
  cacheService: ICacheService;

  simulate(simulationData: any): Promise<any>;
}
