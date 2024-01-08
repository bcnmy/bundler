import { gasEstimateL1ComponentOffchain } from "../arbitrum";
import { EstimationResult, summarizeResults } from "./utils";
import transactions from "./arbitrum.json";

describe("ArbitrumPVG off-chain estimation", () => {
  expect(transactions.length).toBeGreaterThan(0); // sanity check

  const CHAIN_ID = 42161; // Arbitrum One
  const MEAN_ERROR_TRESHOLD = 5; // 5% error threshold

  it("should have an low enough error rate", () => {
    const estimationResults: EstimationResult[] = [];

    for (const tx of transactions) {
      const estimate = gasEstimateL1ComponentOffchain(
        BigInt(tx.value.hex),
        tx.to!,
        tx.data!.toString(),
        BigInt(tx.l1BaseFeeEstimate.hex),
        BigInt(tx.baseFee.hex),
        CHAIN_ID,
      );

      const delta = BigInt(tx.gasForL1.hex) - estimate;

      const deltaPercentage =
        (Math.abs(Number(delta)) / Number(BigInt(tx.gasForL1.hex))) * 100;

      estimationResults.push({
        txHash: tx.hash,
        actual: BigInt(tx.gasForL1.hex),
        estimated: estimate,
        delta,
        deltaPercentage,
      });
    }

    // 💡 HINT: Uncomment this if you want to see the actual estimation results
    // printEstimationResults("ARBITRUM", estimationResults);

    const summary = summarizeResults(estimationResults);
    expect(summary.mean).toBeLessThan(MEAN_ERROR_TRESHOLD);
  });
});
