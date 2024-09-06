import { type Hex, concat, pad, slice, toHex, keccak256, encodeAbiParameters, fromHex} from "viem";
import { isUndefined } from "lodash";
import type { UserOperationStruct } from "../types";
import { config } from "../../config";

const { entryPointV07Data } = config;

export const COMMON_ENTRYPOINT_V7_ADDRESSES : Hex[] = Array.from(Object.keys(entryPointV07Data).map(
  key => key as Hex));

// Definitions can be found in the ERC doc: https://eips.ethereum.org/EIPS/eip-4337#entrypoint-definition
export interface PackedUserOperation {
  sender: Hex;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  accountGasLimits: Hex;
  preVerificationGas: bigint;
  gasFees: Hex;
  paymasterAndData: Hex;
  signature: Hex;
}

// /**
//  * Packs two unsigned 16 byte (128-bit) integers into a single hexadecimal string.
//  * The two integers are converted to hex and padded to ensure a fixed size.
//  * 
//  * @param a - The first unsigned integer (128-bit).
//  * @param b - The second unsigned integer (128-bit).
//  * @returns A Hex string that represents the packed integers.
//  */
export function packUint(high128: bigint, low128: bigint): Hex {
    // eslint-disable-next-line no-bitwise
  const packed = (BigInt(high128) << BigInt(128)) + BigInt(low128);
  return pad(toHex(packed), { size: 32 });
}


// /**
//  * Unpacks a hexadecimal string into two unsigned 16 bytes (128-bit) integers.
//  * The hex string is sliced into two parts corresponding to the original integers.
//  * 
//  * It is used to undo the application of packUint function.
//  * @param packedUints - A Hex string containing the packed integers.
//  * @returns An object containing the two unpacked integers as `a` and `b`.
//  */
export function unpackUint(packed: Hex): [high128: bigint, low128: bigint] {
  const packedNumber = BigInt(fromHex(packed, "bigint"));
    // eslint-disable-next-line no-bitwise
  const high128 = packedNumber >> BigInt(128);
    // eslint-disable-next-line no-bitwise
  const low128 = packedNumber & ((BigInt(1) << BigInt(128)) - BigInt(1));
  return [high128, low128];
}

export function packAccountGasLimits(userOperation: UserOperationStruct): Hex {
  return packUint(userOperation.verificationGasLimit, userOperation.callGasLimit);
}

export function unpackAccountGasLimits(accountGasLimits: Hex) {
  const [ verificationGasLimit, callGasLimit ] = unpackUint(accountGasLimits);
  return {verificationGasLimit, callGasLimit};
}

export function packGasFees(userOperation: UserOperationStruct): Hex {
  return packUint(userOperation.maxPriorityFeePerGas, userOperation.maxFeePerGas);
}

export function unpackGasFees(gasFees: Hex) {
  const [ a, b ] = unpackUint(gasFees);
  const maxPriorityFeePerGas = a;
  const maxFeePerGas = b;

  return {maxPriorityFeePerGas, maxFeePerGas};
}

export function packInitCode(userOperation: UserOperationStruct): Hex {
  if (userOperation.factory !== null && !isUndefined(userOperation.factory) && userOperation.factoryData !== null && !isUndefined(userOperation.factoryData)) {
    return concat([userOperation.factory, userOperation.factoryData]);
  }
  return userOperation.factory == null ? '0x' : toHex(concat([userOperation.factory]));
}

export function unpackInitCode(initCode: Hex) {
  if (initCode != null && initCode.length > 2) {
    const factory = slice(initCode, 0, 20);
    const factoryData = slice(initCode, 20);
    return { factory, factoryData };
  }
  return null;
}

export function packPaymasterAndData(userOperation: UserOperationStruct): Hex {
  if (userOperation.paymaster == null) {
    return `0x`;
  } 
    if (userOperation.paymasterVerificationGasLimit == null || userOperation.paymasterPostOpGasLimit == null) {
      throw new Error('paymaster with no gas limits');
    }
    return concat([
      userOperation.paymaster,
      packUint(userOperation.paymasterVerificationGasLimit, userOperation.paymasterPostOpGasLimit),
      userOperation.paymasterData ?? '0x'
    ]);
  
}

export function unpackPaymasterAndData(paymasterAndData: Hex): {
  paymaster: Hex
  paymasterVerificationGasLimit: bigint
  paymasterPostOpGasLimit: bigint
  paymasterData: Hex
} | null {
  if (paymasterAndData.length <= 2) return null;
  if (paymasterAndData.length < 52) {
    throw new Error(`invalid paymasterAndData: ${paymasterAndData as string}`);
  }
  const [a, b] = unpackUint(slice(paymasterAndData, 20, 52));
  return {
    paymaster: slice(paymasterAndData, 0, 20),
    paymasterVerificationGasLimit: a,
    paymasterPostOpGasLimit: b,
    paymasterData: slice(paymasterAndData, 52)
  };
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
    userOperation: UserOperationStruct,
): PackedUserOperation {
    return {
        sender: userOperation.sender,
        nonce: userOperation.nonce,
        initCode: packInitCode(userOperation),
        callData: userOperation.callData,
        accountGasLimits: packAccountGasLimits(userOperation),
        preVerificationGas: userOperation.preVerificationGas,
        gasFees: packGasFees(userOperation),
        paymasterAndData: packPaymasterAndData(userOperation),
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
): UserOperationStruct {
    const { verificationGasLimit, callGasLimit } = unpackAccountGasLimits(packedUserOperation.accountGasLimits);
    const { maxPriorityFeePerGas, maxFeePerGas } = unpackGasFees(packedUserOperation.gasFees);

    let result : UserOperationStruct = {
        sender: packedUserOperation.sender,
        nonce: packedUserOperation.nonce,
        callData: packedUserOperation.callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas: packedUserOperation.preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        signature: packedUserOperation.signature,
    };

    if (packedUserOperation.initCode != null && packedUserOperation.initCode.length > 2) {
      const factory = slice(packedUserOperation.initCode, 0, 20);
      const factoryData = slice(packedUserOperation.initCode, 20);
      result = {
        ...result,
        factory,
        factoryData
      };
    }
    const paymasterData = unpackPaymasterAndData(packedUserOperation.paymasterAndData);
    if (paymasterData != null) {
      result = {
        ...result,
        paymaster: paymasterData.paymaster,
        paymasterVerificationGasLimit: paymasterData.paymasterVerificationGasLimit,
        paymasterPostOpGasLimit: paymasterData.paymasterPostOpGasLimit,
        paymasterData: paymasterData.paymasterData
      };
    }
    return result;
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
