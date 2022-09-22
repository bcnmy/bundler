import { SimulationDataType, SimulationResponseType } from '../types';

export interface ISimulation {
  simulate(simulationData: SimulationDataType): Promise<SimulationResponseType>;
}
