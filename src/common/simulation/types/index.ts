import {
  EntryPointContractType,
  EntryPointV07ContractType,
  StateOverrideSetType,
  UserOperationType,
  UserOperationStruct
} from "../../types";

// data response type that external simulation serivcereturns
export type ExternalSimulationResponseType = {
  isSimulationSuccessful: boolean;
  message: string;
  data: {
    refundAmount: number;
    refundAmountInUSD: number;
    gasLimitFromSimulation: number | BigInt;
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
  entryPointContract: EntryPointContractType;
  chainId: number;
};


export type BundlerSimulationDataType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type BundlerSimulationDataTypeV07 = {
  userOp: UserOperationStruct;
  entryPointContract: EntryPointV07ContractType;
  chainId: number;
};

export type EstimateUserOperationGasDataType = {
  userOp: UserOperationType;
  entryPointContract: EntryPointContractType;
  chainId: number;
  stateOverrideSet?: StateOverrideSetType;
};

export type EstimateUserOperationGasDataTypeV07 = {
  userOp: UserOperationStruct;
  entryPointContract: EntryPointV07ContractType;
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

export type SimulationDataV07 = {
  userOp: UserOperationStruct;
  entryPointContract: EntryPointV07ContractType;
  chainId: number;
};


export type ValidationData = {
  userOp: UserOperationType;
  networkMaxPriorityFeePerGas: bigint;
  networkMaxFeePerGas: bigint;
};

export type ValidationDataV07 = {
  userOp: UserOperationStruct;
  networkMaxPriorityFeePerGas: bigint;
  networkMaxFeePerGas: bigint;
};