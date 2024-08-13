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

/**
 * Packs two unsigned 16 byte (128-bit) integers into a single hexadecimal string.
 * The two integers are converted to hex and padded to ensure a fixed size.
 * 
 * @param a - The first unsigned integer (128-bit).
 * @param b - The second unsigned integer (128-bit).
 * @returns A Hex string that represents the packed integers.
 */
export function packUint(a: bigint, b: bigint): Hex {
  return concat([
    pad(toHex(a), { size: 16 }),
    pad(toHex(b), { size: 16 }),
  ]) as Hex;
}

/**
 * Unpacks a hexadecimal string into two unsigned 16 bytes (128-bit) integers.
 * The hex string is sliced into two parts corresponding to the original integers.
 * 
 * It is used to undo the application of packUint function.
 * @param packedUints - A Hex string containing the packed integers.
 * @returns An object containing the two unpacked integers as `a` and `b`.
 */
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

/**
 * Packs a UserOperation object into a PackedUserOperation format.
 * 
 * UserOperation is a well known object in Account Abstraction.
 * PackedUserOperation is an object introduced in EntryPoint v0.7,
 * as an object that is being sent to EntryPoint smart contract.
 *  
 * @param userOperation - The UserOperationType object to be packed.
 * @returns The PackedUserOperation object.
 */
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

/**
 * Unpacks a PackedUserOperation object back into a UserOperationType format.
 * 
 * @param packedUserOperation - The PackedUserOperation object to be unpacked.
 * @returns The UserOperationType object.
 */
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
    } 
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
