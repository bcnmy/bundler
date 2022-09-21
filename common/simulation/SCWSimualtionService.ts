import { IExternalSimulation, ISimulation } from './interface';
import { SimulationDataType, SimulationResponseType, TenderlySimulationDataType } from './types';

export class SCWSimulationService implements ISimulation<TenderlySimulationDataType> {
  externalSimulationService: IExternalSimulation<TenderlySimulationDataType>;

  constructor(externalSimulationService: IExternalSimulation<TenderlySimulationDataType>) {
    this.externalSimulationService = externalSimulationService;
  }

  simulate(simulationData: SimulationDataType): Promise<SimulationResponseType> {
    return this.externalSimulationService.simulate(simulationData);
  }
}
