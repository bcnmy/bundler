import { BigNumber, ethers } from 'ethers';
import {
  EVMRawTransactionType, EntityInfoType, StakeInfo, UserOperationType,
} from '../../types';
import { IEVMAccount } from '../../../relayer/src/services/account';
import { INetworkService } from '../../network';

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean;
  message: string;
  data: {
    refundAmount: number;
    refundAmountInUSD: number;
    gasLimitFromSimulation: number | BigNumber;
  };
};

// data type that simulation service expects
export type SimulationDataType = {
  chainId: number;
  data: string;
  to: string;
  refundInfo?: { tokenGasPrice: string; gasToken: string };
};

export type AASimulationDataType = {
  userOp: UserOperationType;
  entryPointContract: ethers.Contract;
  chainId: number;
};

export type ValidateUserOpDataType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract,
  chainId: number
};

export type BundlerSimulationDataType = {
  userOp: UserOperationType;
  entryPointContract: ethers.Contract;
  chainId: number;
};

export type BundlerValidationResponseType = {
  isValidationSuccessful: boolean,
  data: {
    userOpHash?: string,
    entityInfo?: EntityInfoType
    gasLimitFromSimulation: number | BigNumber,
  },
  message: string,
  code?: number,
};

export type EstimateUserOperationGasDataType = {
  userOp: UserOperationType;
  entryPointContract: ethers.Contract;
  chainId: number;
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean;
  data: {
    refundAmount?: number;
    refundAmountInUSD?: number;
    userOpHash?: string;
    gasLimitFromSimulation: number | BigNumber;
  };
  message: string;
  code?: number;
};

export type EstimateUserOperationGasReturnType = {
  code: number;
  message: string;
  data: {
    preVerificationGas: number;
    verificationGasLimit: number;
    callGasLimit: number;
    validAfter: number;
    validUntil: number;
    deadline: number;
  };
};

export type EstimateUserOpGasFieldsType = {
  code: number;
  message: string;
  data: {
    preVerificationGas: number;
    verificationGasLimit: number;
    callGasLimit: number;
  };
};

export type UserOpValidationParamsType = {
  networkService: INetworkService<IEVMAccount, EVMRawTransactionType>,
  options: {
    chainId: number
  }
};

export type SimulateValidationParamsType = {
  userOp: UserOperationType,
  entryPointContract: ethers.Contract
};

export type SimulateHandleOpsParamsType = {
  userOps: UserOperationType[],
  entryPointContract: ethers.Contract
};

export type SimulateValidationReturnType = {
  returnInfo: any;
  senderInfo: any;
  factoryInfo: StakeInfo | undefined;
  paymasterInfo: StakeInfo | undefined;
  aggregatorInfo: StakeInfo | undefined;
};
