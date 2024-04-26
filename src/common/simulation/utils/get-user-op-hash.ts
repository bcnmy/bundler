import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { UserOperationType } from "../../types";
import { packUserOpForUserOpHash } from "../../utils";

/**
 * Method calculates user operation hash
 * @param entryPointAddress - address of the entry point
 * @param userOp - user operation
 * @param chainId - chain id
 * @returns user operation hash
 */
export const getUserOpHash = (
  entryPointAddress: `0x${string}`,
  userOp: UserOperationType,
  chainId: number,
) => {
  const userOpHash = keccak256(packUserOpForUserOpHash(userOp, true));
  const enc = encodeAbiParameters(
    parseAbiParameters("bytes32, address, uint256"),
    [userOpHash, entryPointAddress, BigInt(chainId)],
  );
  return keccak256(enc);
};
