import { ISimulation } from './interface';
import { SimulationDataType, SimulationResponseType, TenderlySimulationDataType } from './types';

export class AASimulationService implements ISimulation {
  constructor(externalSimulationService: IExternalSimulation<TenderlySimulationDataType>) {
  }

  simulate(simulationData: SimulationDataType): Promise<SimulationResponseType> {
    return this.externalSimulationService.simulate(simulationData);
  }
}
