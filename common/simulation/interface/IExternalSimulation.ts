import { IGasPrice } from '../../gas-price';

export interface IExternalSimulation<SimulationDataType, SimulationResultType> {
  gasPriceService: IGasPrice;

  simulate(simulationData: SimulationDataType): Promise<SimulationResultType>;
}
