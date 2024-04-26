import {
  EntryPointContractType,
  StateOverrideSetType,
  UserOperationType,
} from "../../types";

// data type that simulation service expects
export type SimulationDataType = {
  chainId: number;
  data: string;
  to: string;
  refundInfo?: { tokenGasPrice: string; gasToken: string };
};

export type AASimulationDataType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type BundlerSimulationDataType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type EstimateUserOperationGasDataType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
  stateOverrideSet?: StateOverrideSetType;
};

// data response type that simulation service returns
export type SimulationResponseType = {
  isSimulationSuccessful: boolean;
  data: {
    refundAmount?: number;
    refundAmountInUSD?: number;
    userOpHash?: string;
    gasLimitFromSimulation: number | BigInt;
  };
  message: string;
  code?: number;
};

export type EstimateUserOperationGasReturnType = {
  code: number;
  message: string;
  data: {
    preVerificationGas: bigint;
    verificationGasLimit: bigint;
    callGasLimit: bigint;
    validAfter: number;
    validUntil: number;
    userOpHash?: string;
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

export type SimulateHandleOpsParamsType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type SimulateHandleOpsReturnType = {
  reason?: string;
  totalGas: number;
  data?: string;
  isExecutionSuccess?: boolean;
};

export type SimulationData = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type ValidationData = {
  userOp: UserOperationType;
  networkMaxPriorityFeePerGas: bigint;
  networkMaxFeePerGas: bigint;
  networkPreVerificationGas: bigint;
  maxPriorityFeePerGasThresholdPercentage: number;
  maxFeePerGasThresholdPercentage: number;
  preVerificationGasThresholdPercentage: number;
};
