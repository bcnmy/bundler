import { toBytes } from "viem";

const SCALAR = 0.684; // scalar is a hardcoded constant in the oracle smart contract that doesn't change often (if ever)
const SCALAR_DECIMALS = 1e3; // the number of decimals in the scalar
const OVERHEAD = BigInt(188); // fixed overhead added to the gas usage that doesn't change often (if ever)
// Adds 68 bytes of padding to account for the fact that the input does not have a signature
const SIGNATURE_PADDING = BigInt(68 * 16);

// Based on the getL1GasUsed function in the GasPriceOracle.sol (https://optimistic.etherscan.io/address/0xc0d3c0d3c0d3c0d3c0d3c0d3c0d3c0d3c0d3000f#code#F11#L105)
function getL1GasUsed(serialized: string): bigint {
  // convert the hex string to a byte array
  const bytes = toBytes(serialized);

  // check every byte and count it's price
  let total = BigInt(0);
  for (const byte of bytes) {
    if (byte === 0) {
      total += BigInt(4);
    } else {
      total += BigInt(16);
    }
  }

  return total + OVERHEAD + SIGNATURE_PADDING;
}

// estimateFeeOffchain calculates the L1 fee based on the given serialized transaction and the L1 base fee.
export function estimateFeeOffchain(
  serialized: string,
  l1BaseFee: bigint,
): bigint {
  // calculate gas usage based on the serialized transaction data
  const l1GasUsed = getL1GasUsed(serialized);

  // calculate the "unscaled" fee
  const l1Fee = l1BaseFee * l1GasUsed;

  // safe float division
  return (l1Fee * BigInt(SCALAR * SCALAR_DECIMALS)) / BigInt(SCALAR_DECIMALS);
}
