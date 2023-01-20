import { BigNumber, ethers } from 'ethers';
import { UserOperationType } from '../../types';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean,
  message: string,
  gasLimitFromSimulation: number | BigNumber,
};

// data type that simulation service expects
export type SimulationDataType = {
  chainId: number,
  data: string,
  to: string,
  refundInfo?: any,
};

export type AASimulationDataType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract,
  chainId: number
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasLimitFromSimulation: number | BigNumber,
  message: string,
};
