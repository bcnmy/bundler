// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  simulationSuccess: boolean,
  simualtionGasLimit: number,
};

// data type that simulation service expects
export type SimulationDataType = {

};

// data response type that simulation service returns
export type SimulationResponseType = {

};

// data type that tenderly simulation service expects
export type TenderlySimulationDataType = {
  chainId: number,
  data: string,
  wallet: string,
  refundInfo: { tokenGasPrice: string, gasToken: string },
  gasPriceMap: any
};
