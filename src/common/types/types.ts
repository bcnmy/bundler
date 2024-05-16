import { ENTRY_POINT_ABI } from "entry-point-gas-estimations";
import { GetContractReturnType } from "viem";

// Common GasPriceType that represents both 1559 and Legacy gas prices
export type GasPriceType =
  | {
      maxPriorityFeePerGas: bigint;
      maxFeePerGas: bigint;
    }
  | bigint;

// EVM 1559 Raw Transaction type
export type EVM1559RawTransaction = {
  from: `0x${string}`;
  maxPriorityFeePerGas: bigint;
  maxFeePerGas: bigint;
  gasLimit: bigint;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  chainId: number;
  nonce: number;
  accessList?: AccessList[];
  type: string;
};

export type AccessList = {
  address: `0x${string}`;
  storageKeys: `0x${string}`[];
};

// EVM Legacy Raw Transaction type
export type EVMLegacyRawTransaction = {
  from: `0x${string}`;
  gasPrice: bigint;
  gasLimit: bigint;
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
  chainId: number;
  nonce: number;
  type: string;
};

export type EntryPointMap = {
  [chainId: number]: Array<{
    address: string;
    entryPointContract: EntryPointContractType;
  }>;
};

export type EntryPointContractType = GetContractReturnType<
  typeof ENTRY_POINT_ABI
>;
