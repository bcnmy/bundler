import { AxiosResponse } from 'axios';
import { BigNumber } from 'ethers';
import { UserOperationType } from '../../types';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean,
  msgFromSimulation?: string,
  gasLimitFromSimulation: number | BigNumber,
  rawResponse: AxiosResponse
};

export type BaseSimulationDataType = {
  chainId: number,
  data: string,
  to: string,
};

// data type that simulation service expects
export type SCWSimulationDataType = BaseSimulationDataType & {
  refundInfo?: any,
};

export type CCMPSimulationDataType = BaseSimulationDataType;


export type AASimulationDataType = {
  userOp: UserOperationType,
  entryPointAddress: string,
  entryPointAbi: string
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasLimitFromSimulation: number | BigNumber,
  msgFromSimulation?: string,
};
