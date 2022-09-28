import { UserOperationType } from '../../types';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  simulationSuccess: boolean,
  simulationMessage: string,
  simualtionGasLimit: number,
};

// data type that simulation service expects
export type SCWSimulationDataType = {
  chainId: number,
  data: string,
  to: string,
  refundInfo: any,
};

export type AASimulationDataType = {
  userOp: UserOperationType,
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasLimitFromSimulation: number,
  msgFromSimulation: string,
};

// data type that tenderly simulation service expects
export type TenderlySimulationDataType = {
  chainId: number,
  data: string,
  wallet: string,
  refundInfo: { tokenGasPrice: string, gasToken: string },
  gasPriceMap: any
};
