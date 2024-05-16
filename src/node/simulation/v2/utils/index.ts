import { UserOperation } from "entry-point-gas-estimations";
import { encodeAbiParameters, parseAbiParameters, keccak256 } from "viem";

/**
 * pack the userOperation
 * @param op
 * @param forSignature "true" if the hash is needed to calculate the getUserOpHash()
 *  "false" to pack entire UserOp, for calculating the calldata cost of putting it on-chain.
 */
export function packUserOpForUserOpHash(
  op: Partial<UserOperation>,
  forSignature = true,
): `0x${string}` {
  if (!op.initCode || !op.callData || !op.paymasterAndData)
    throw new Error("Missing userOp properties");

  if (forSignature) {
    return encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, bytes32, uint256, uint256, uint256, uint256, uint256, bytes32",
      ),
      [
        op.sender as `0x${string}`,
        op.nonce as bigint,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.callGasLimit as bigint,
        op.verificationGasLimit as bigint,
        op.preVerificationGas as bigint,
        op.maxFeePerGas as bigint,
        op.maxPriorityFeePerGas as bigint,
        keccak256(op.paymasterAndData),
      ],
    );
  }
  // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
  return encodeAbiParameters(
    parseAbiParameters(
      "address, uint256, bytes, bytes, uint256, uint256, uint256, uint256, uint256, bytes, bytes",
    ),
    [
      op.sender as `0x${string}`,
      op.nonce as bigint,
      op.initCode,
      op.callData,
      op.callGasLimit as bigint,
      op.verificationGasLimit as bigint,
      op.preVerificationGas as bigint,
      op.maxFeePerGas as bigint,
      op.maxPriorityFeePerGas as bigint,
      op.paymasterAndData,
      op.signature as `0x${string}`,
    ],
  );
}
