import { BigNumber, ethers } from 'ethers';
import { CCMPMessageType, UserOperationType } from '../../types';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean,
  msgFromSimulation: string,
  gasLimitFromSimulation: number | BigNumber,
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
  entryPointContract: ethers.Contract,
  chainId: number
};

export type CCMPSimulationDataType = {
  ccmpMessage: CCMPMessageType,
};

export type CCMPSimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasEstimateFromSimulation: number,
  txBaseGasEstimate: number,
  err?: string,
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasLimitFromSimulation: number | BigNumber,
  msgFromSimulation: string,
};

export type EthCallSimulationDataType = {
  from?: string;
  gas?: number;
  gasPrice?: number;
  value?: number;
  estimationCalldata: string;
  contractAddress: string;
  overrides?: Record<
  string,
  {
    code?: string;
    balance?: string;
    nonce?: string;
    state?: Record<string, string>;
    stateDiff?: Record<string, string>;
  }
  >;
  tag: number | 'latest' | 'earliest' | 'pending';
};

export type EthCallSimulationResponseType = {
  isSimulationSuccessful: boolean,
  gasEstimateFromSimulation: number,
  txBaseGasEstimate: number,
  err?: string,
};
