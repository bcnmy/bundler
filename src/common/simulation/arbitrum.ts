import {
  getAddress,
  serializeTransaction,
  toBytes,
  TransactionSerializable,
} from "viem";
import zlib from "zlib";
import { prefix0x } from "./utils";

// The following constants are copied from the Arbitrum Nitro implementation:
// https://github.com/OffchainLabs/nitro/blob/e815395d2e91fb17f4634cad72198f6de79c6e61/nodeInterface/NodeInterface.go#L444
const ONE_IN_BIPS = BigInt(10000);
const GAS_ESTIMATION_L1_PRICE_PADDING = BigInt(11000); // pad estimates by 10%
const TX_DATA_NON_ZERO_GAS_EIP2028 = BigInt(16);
const ESTIMATION_PADDING_BASIS_POINTS = BigInt(100);
const ESTIMATION_PADDING_UNITS = BigInt(16) * TX_DATA_NON_ZERO_GAS_EIP2028;

// The elliptic curve N value, used for calculating the maximum s value of a signature
// to create a mock transaction for gas estimation purposes
const SECP_256K1_N = BigInt(
  "0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141",
);

// Craft the mock transaction for estimation purposes.
// The general idea  is to create a transaction with highest allowed values for every mock parameter, but the reference implementation in the Node does it differently.
// So we copied the values we could from their implementation and for the rest We used the highest possible values.
function makeFakeTxForMessage(
  value: bigint,
  to: string,
  data: string,
  chainId: number,
): TransactionSerializable {
  return {
    // actual transaction data
    to: getAddress(to, chainId),
    value,
    data: prefix0x(data),
    // others are hardcoded fake values
    // The Nitro (Go) implementation uses a nonce value that’s higher than Number.MAX_SAFE_INTEGER. So I set it to the highest allowed number value.
    nonce: Number.MAX_SAFE_INTEGER - 1, // max allowed nonce
    maxPriorityFeePerGas: BigInt("0x39ba7d26"),
    maxFeePerGas: BigInt("0xf1aa387f"),
    gas: BigInt("0xb8480ca2"),
    v: BigInt(126483),
    r: "0xef22bddd350b943170a67d35191c27e310709a28c38b5762a152ff640108f5b2",
    // Nitro uses a s value that’s out of bounds and doesn’t pass ethers serialization validation. I set it to the highest allowed value based on EIP-2.
    s: `0x${(SECP_256K1_N / BigInt(2)).toString(16)}`, // max s value, based on EIP-2
    chainId,
    type: "eip1559",
  };
}

function byteCountAfterBrotli(bytes: Uint8Array): bigint {
  const original = Buffer.from(bytes);

  // compress with Brotli level 0 (fastest)
  const compressed = zlib.brotliCompressSync(original, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MIN_QUALITY,
    },
  });

  return BigInt(compressed.byteLength);
}

function getPosterUnits(tx: TransactionSerializable): bigint {
  const serialized = serializeTransaction(tx, { r: tx.r!, s: tx.s!, v: tx.v! });

  const txBytes = toBytes(serialized);

  // compress and count the bytes
  const l1Bytes = byteCountAfterBrotli(txBytes);

  // multiply by the gas cost per byte
  return l1Bytes * TX_DATA_NON_ZERO_GAS_EIP2028;
}

function bigMulByBips(value: bigint, bips: bigint): bigint {
  return (value * bips) / ONE_IN_BIPS;
}

function posterDataCost(
  value: bigint,
  to: string,
  data: string,
  pricePerUnit: bigint,
  chainId: number,
): bigint {
  // create a fake tx from the given data for estimation purposes
  const tx = makeFakeTxForMessage(value, to, data, chainId);

  // count units spent (size of tx data)
  let units = getPosterUnits(tx);

  // add some padding
  units = bigMulByBips(
    units + ESTIMATION_PADDING_UNITS,
    ONE_IN_BIPS + ESTIMATION_PADDING_BASIS_POINTS,
  );

  // multiply by the price per unit
  return units * pricePerUnit;
}

// Off-chain implementation off the GasEstimateL1Component method of the Arbitrum Nitro Node Interface.
// https://github.com/OffchainLabs/nitro/blob/e815395d2e91fb17f4634cad72198f6de79c6e61/nodeInterface/NodeInterface.go#L444
export function gasEstimateL1ComponentOffchain(
  value: bigint,
  to: string,
  data: string,
  l1BaseFeeEstimate: bigint,
  baseFee: bigint,
  chainId: number,
) {
  // first we calculate the data cost for the transaction
  let feeForL1 = posterDataCost(value, to, data, l1BaseFeeEstimate, chainId);

  // then we add some padding
  feeForL1 = bigMulByBips(feeForL1, GAS_ESTIMATION_L1_PRICE_PADDING);

  // and finally we divide by the base fee to get the gas estimate
  return feeForL1 / baseFee;
}
