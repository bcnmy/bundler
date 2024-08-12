import { type Hex, concat, pad, slice, toHex, keccak256, encodeAbiParameters} from "viem";
import type { UserOperationType } from "../types";

// TODO: Move this to config after we refactor the config
export const COMMON_ENTRYPOINT_V7_ADDRESSES : [`0x${string}`] = [
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

export function packUint(a: bigint, b: bigint): Hex {
  return concat([
    pad(toHex(a), { size: 16 }),
    pad(toHex(b), { size: 16 }),
  ]) as Hex;
}

export function unpackUint(packedUints: Hex) {
    return {
      a: BigInt(slice(packedUints, 0, 16)),
      b: BigInt(slice(packedUints, 16)),
  };
}

export function packAccountGasLimits(userOperation: UserOperationType): Hex {
  return packUint(userOperation.verificationGasLimit, userOperation.callGasLimit);
}

export function unpackAccountGasLimits(accountGasLimits: Hex) {
  const { a, b } = unpackUint(accountGasLimits);
  const verificationGasLimit = a;
  const callGasLimit = b;

  return {verificationGasLimit, callGasLimit};
}

export function packGasFees(userOperation: UserOperationType): Hex {
  return packUint(userOperation.maxPriorityFeePerGas, userOperation.maxFeePerGas);
}

export function unpackGasFees(gasFees: Hex) {
    const { a, b } = unpackUint(gasFees);
    const maxPriorityFeePerGas = a;
    const maxFeePerGas = b;

    return {maxPriorityFeePerGas, maxFeePerGas};
}

export function packUserOperation(
    userOperation: UserOperationType,
): PackedUserOperation {
    return {
        sender: userOperation.sender,
        nonce: userOperation.nonce,
        initCode: userOperation.initCode,
        callData: userOperation.callData,
        accountGasLimits: packAccountGasLimits(userOperation),
        preVerificationGas: userOperation.preVerificationGas,
        gasFees: packGasFees(userOperation),
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

export function encodePackedUserOp(
  userOp: PackedUserOperation,
  forSignature=true
): `0x${string}` {
    if (forSignature) {
      return encodeAbiParameters(
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
    } else {
      return encodeAbiParameters(
        [
          { type: 'address' },
          { type: 'uint256' },
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'uint256' },
          { type: 'bytes32' },
          { type: 'bytes32' },
          { type: 'bytes'   }, 
        ],
        [
          userOp.sender,
          userOp.nonce,
          userOp.initCode,
          userOp.callData,
          userOp.accountGasLimits,
          userOp.preVerificationGas,
          userOp.gasFees,
          userOp.paymasterAndData,
          userOp.signature
        ]
      );
    }
}

export function getUserOpHash(
    userOp: PackedUserOperation,
    entryPoint: `0x${string}`,
    chainId: bigint
): Hex {
    const userOpHash = keccak256(encodePackedUserOp(userOp, true));
  
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
