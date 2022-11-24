export interface ISimulationService<SimulationDataType, SimulationResultType> {
  simulate(simulationData: SimulationDataType): Promise<SimulationResultType>;
}
