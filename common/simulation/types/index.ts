import { BigNumber, ethers } from 'ethers';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';
import { EVMRawTransactionType, FallbackGasTankMapType, UserOperationType } from '../../types';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean,
  message: string,
  data: {
    refundAmount: number,
    refundAmountInUSD: number,
    gasLimitFromSimulation: number | BigNumber,
  }
};

// data type that simulation service expects
export type SimulationDataType = {
  chainId: number,
  data: string,
  to: string,
  refundInfo?: { tokenGasPrice: string, gasToken: string },
};

export type FallbackGasTankDepositSimulationDataType = {
  chainId: number,
  value: string,
  paymasterId: string,
};

export type FallbackGasTankDepositSimualtionParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  options: {
    fallbackGasTankMap: FallbackGasTankMapType
  }
};

export type AASimulationDataType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract,
  chainId: number
};

export type BundlerSimulationDataType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract,
  chainId: number
};

export type EstimateUserOperationGasDataType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract,
  chainId: number
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean,
  data: {
    refundAmount?: number,
    refundAmountInUSD?: number,
    userOpHash?: string,
    gasLimitFromSimulation: number | BigNumber,
  },
  message: string,
  code?: number,
};

export type EstimateUserOperationGasReturnType = {
  code: number,
  message: string,
  data: {
    preVerificationGas: number,
    verificationGasLimit: number,
    callGasLimit: number,
    validAfter: number,
    validUntil: number,
    deadline: number,
  },
};
