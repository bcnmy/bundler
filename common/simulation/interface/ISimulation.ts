import { SimulationDataType, SimulationResponseType } from '../types';
import { IExternalSimulation } from './IExternalSimulation';

export interface ISimulation<ExternalSimulationData> {
  externalSimulationService: IExternalSimulation,

  simulate(simulationData: SimulationDataType): Promise<SimulationResponseType>;
}
