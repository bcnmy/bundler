import { TenderlySimulationService } from './external-simulation';
import { SCWSimulationDataType, SimulationResponseType } from './types';

export class SCWSimulationService {
  static async simulate(simulationData: SCWSimulationDataType): Promise<SimulationResponseType> {
    await TenderlySimulationService.simulate(simulationData);
    return {
      isSimulationSuccessful: true,
      gasLimitFromSimulation: 500000,
    };
  }
}
