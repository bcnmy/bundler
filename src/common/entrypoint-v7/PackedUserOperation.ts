import { UserOperationType } from "../types";

// TODO: Move this to config after we refactor the config
export const COMMON_ENTRYPOINT_V7_ADDRESSES = [
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
];

// TODO: Check if we are using the correct types for this struct
// Also add a link to documentation or reference implementation
export interface PackedUserOperation {
  // address sender;
  sender: string;
  // uint256 nonce;
  nonce: bigint;
  // bytes initCode;
  initCode: string;
  // bytes callData;
  callData: string;
  // bytes32 accountGasLimits;
  accountGasLimits: string;
  // uint256 preVerificationGas;
  preVerificationGas: bigint;
  // bytes32 gasFees;
  gasFees: string;
  // bytes paymasterAndData;
  paymasterAndData: string;
  // bytes signature;
  signature: string;
}

export function packUserOperation(
  userOperation: UserOperationType,
): PackedUserOperation {
  // TODO: replace the following stub with the actual packing code
  return {
    sender: userOperation.sender,
    accountGasLimits: "0x", // TODO: How to pack this?
    callData: userOperation.callData,
    gasFees: "0x", // TODO: How to pack this?
    initCode: userOperation.initCode,
    nonce: userOperation.nonce,
    paymasterAndData: userOperation.paymasterAndData,
    preVerificationGas: userOperation.preVerificationGas,
    signature: userOperation.signature,
  };
}

// TODO: Implement this, should be the reverse of packUserOperation
export function unpackUserOperation(
  packedUserOperation: PackedUserOperation,
): UserOperationType {
  return packedUserOperation as any as UserOperationType;
}

// TODO: Rewrite the following Solidity function to TypeScript
/// @inheritdoc IEntryPoint
//  function getUserOpHash(
//    PackedUserOperation calldata userOp
//  ) public view returns (bytes32) {
//     return keccak256(abi.encode(userOp.hash(), address(this), block.chainid));
// }
export function getUserOpHash(userOp: PackedUserOperation): string {
  return userOp.toString();
}
