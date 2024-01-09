import {
  TransactionSerializable,
  getAddress,
  serializeTransaction,
} from "viem";
import transactions from "./optimism.json";
import { EstimationResult, summarizeResults } from "./utils";
import { estimateFeeOffchain } from "../optimism";
import { prefix0x } from "../arbitrum";

describe("OptimismPVG off-chain estimation", () => {
  expect(transactions.length).toBeGreaterThan(0); // sanity check
  const OPTIMISM_CHAIN_ID = 10;
  const MEAN_ERROR_TRESHOLD = 1; // 1% error threshold

  it("should have an low enough error rate", () => {
    const estimationResults: EstimationResult[] = [];

    // run tests only on fixtures that have a 'to' address
    for (const tx of transactions.filter((t) => t.to)) {
      const unsigned: TransactionSerializable = {
        to: getAddress(tx.to!, OPTIMISM_CHAIN_ID),
        nonce: tx.nonce,
        gas: BigInt(tx.gasLimit.hex),
        gasPrice: BigInt(tx.gasPrice.hex),
        data: prefix0x(tx.data),
        value: BigInt(tx.value.hex),
        chainId: OPTIMISM_CHAIN_ID,
      };

      const serialized = serializeTransaction(unsigned);

      const estimate = estimateFeeOffchain(
        serialized,
        BigInt(tx.l1BaseFee.hex),
      );

      const actual = BigInt(tx.l1fee.hex);
      const delta = actual - estimate;
      const deltaPercentage = (Math.abs(Number(delta)) / Number(actual)) * 100;

      const result = {
        txHash: tx.hash,
        actual,
        estimated: estimate,
        delta,
        deltaPercentage,
      };

      estimationResults.push(result);
    }

    // 💡 HINT: Uncomment this if you want to see the actual estimation results
    // printEstimationResults("OPTIMISM", estimationResults);

    const summary = summarizeResults(estimationResults);
    expect(summary.mean).toBeLessThan(MEAN_ERROR_TRESHOLD);
  });
});
