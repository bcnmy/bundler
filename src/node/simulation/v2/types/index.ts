import { StateOverrideSet, UserOperation } from "entry-point-gas-estimations";
import { EntryPointContractType } from "../../../../common/types";

export type EstimateUserOperationGasDataType = {
  userOp: UserOperation;
  entryPointContract: EntryPointContractType;
  chainId: number;
  stateOverrideSet?: StateOverrideSet;
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

export type SimulationData = {
  userOp: UserOperation;
  entryPointContract: EntryPointContractType;
  chainId: number;
};

export type ValidationData = {
  userOp: UserOperation;
  networkMaxPriorityFeePerGas: bigint;
  networkMaxFeePerGas: bigint;
};
