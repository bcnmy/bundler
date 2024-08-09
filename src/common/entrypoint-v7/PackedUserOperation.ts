import { type Hex, concat, pad, slice, toHex, keccak256, encodeAbiParameters} from "viem";
import type { UserOperationType } from "../types";

// TODO: Move this to config after we refactor the config
export const COMMON_ENTRYPOINT_V7_ADDRESSES = [
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
];

// Definitions can be found in the ERC doc: https://eips.ethereum.org/EIPS/eip-4337#entrypoint-definition
export interface PackedUserOperation {
  sender: `0x${string}`;
  nonce: bigint;
  initCode: `0x${string}`;
  callData: `0x${string}`;
  accountGasLimits: `0x${string}`;
  preVerificationGas: bigint;
  gasFees: `0x${string}`;
  paymasterAndData: `0x${string}`;
  signature: `0x${string}`;
}

export function packPaymasterData(
  paymaster: `0x${string}`,
  paymasterVerificationGasLimit: number | bigint,
  postOpGasLimit: number | bigint,
  paymasterData: `0x${string}`
): Hex {
  return concat([
      paymaster,
      pad(toHex(paymasterVerificationGasLimit), { size: 16 }),
      pad(toHex(postOpGasLimit), { size: 16 }),
      paymasterData
  ]) as Hex;
}
export function getAccountGasLimits(userOperation: UserOperationType): Hex {
    return concat([
        pad(toHex(userOperation.verificationGasLimit), { size: 16 }),
        pad(toHex(userOperation.callGasLimit), { size: 16 }),
    ]) as Hex;
}

export function unpackAccountGasLimits(accountGasLimits: Hex) {
    return {
        verificationGasLimit: BigInt(slice(accountGasLimits, 0, 16)),
        callGasLimit: BigInt(slice(accountGasLimits, 16)),
    };
}

export function getGasFees(userOperation: UserOperationType): Hex {
    return concat([
        pad(toHex(userOperation.maxPriorityFeePerGas), { size: 16 }),
        pad(toHex(userOperation.maxFeePerGas), { size: 16 }),
    ]) as Hex;
}

export function unpackGasFees(gasFees: Hex) {
    return {
        maxPriorityFeePerGas: BigInt(slice(gasFees, 0, 16)),
        maxFeePerGas: BigInt(slice(gasFees, 16)),
    };
}

export function packUserOperation(
    userOperation: UserOperationType,
): PackedUserOperation {
    return {
        sender: userOperation.sender,
        nonce: userOperation.nonce,
        initCode: userOperation.initCode,
        callData: userOperation.callData,
        accountGasLimits: getAccountGasLimits(userOperation),
        preVerificationGas: userOperation.preVerificationGas,
        gasFees: getGasFees(userOperation),
        paymasterAndData: userOperation.paymasterAndData,
        signature: userOperation.signature,
    };
}

export function unpackUserOperation(
    packedUserOperation: PackedUserOperation,
): UserOperationType {
    const { verificationGasLimit, callGasLimit } = unpackAccountGasLimits(packedUserOperation.accountGasLimits);
    const { maxPriorityFeePerGas, maxFeePerGas } = unpackGasFees(packedUserOperation.gasFees);

    return {
        sender: packedUserOperation.sender,
        nonce: packedUserOperation.nonce,
        initCode: packedUserOperation.initCode,
        callData: packedUserOperation.callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas: packedUserOperation.preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData: packedUserOperation.paymasterAndData,
        signature: packedUserOperation.signature,
    };
}

export function getUserOpHash(
    userOp: PackedUserOperation,
    entryPoint: `0x${string}`,
    chainId: bigint
): Hex {
    const userOpEncoded = encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'bytes32' },
        { type: 'bytes32' },
      ],
      [
        userOp.sender,
        userOp.nonce,
        keccak256(userOp.initCode),
        keccak256(userOp.callData),
        userOp.accountGasLimits,
        userOp.preVerificationGas,
        userOp.gasFees,
        keccak256(userOp.paymasterAndData),
      ]
    );
    const userOpHash = keccak256(userOpEncoded);
  
    const fullEncodedData = encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        userOpHash,
        entryPoint,
        chainId,
      ]
    );
  
    return keccak256(fullEncodedData);
}
