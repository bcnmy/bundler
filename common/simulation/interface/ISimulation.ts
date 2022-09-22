import { SimulationDataType, SimulationResponseType } from '../types';
import { IExternalSimulation } from './IExternalSimulation';

export interface ISimulation<ExternalSimulationData> {
  externalSimulationService: IExternalSimulation<ExternalSimulationData>,

  simulate(simulationData: SimulationDataType): Promise<SimulationResponseType>;
}
