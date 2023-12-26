import { gasEstimateL1ComponentOffchain } from "../arbitrum";
import transactions from "./arbitrum.json";

interface EstimationResult {
  txHash: string;
  actual: BigInt;
  estimated: BigInt;
  delta: BigInt;
  deltaPercentage: number;
}

interface ErrorRate {
  mean: number;
  median: number;
  max: EstimationResult;
}

function summarizeResults(results: EstimationResult[]): ErrorRate {
  const meanDifference =
    results.reduce((a, b) => a + b.deltaPercentage!, 0) / results.length;

  const median = (arr: EstimationResult[]) => {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort(
      (a, b) => a.deltaPercentage! - b.deltaPercentage!,
    );
    return arr.length % 2 !== 0
      ? nums[mid].deltaPercentage
      : (nums[mid - 1].deltaPercentage! + nums[mid].deltaPercentage!) / 2;
  };

  const max = results.reduce((prev, current) =>
    prev.deltaPercentage! > current.deltaPercentage! ? prev : current,
  );

  return {
    mean: meanDifference,
    median: median(results),
    max,
  };
}

// a helper function to log the estimation results to the console
export function printEstimationResults(
  label: string,
  results: EstimationResult[],
) {
  const summary = summarizeResults(results);

  // eslint-disable-next-line no-console
  console.log(
    `[${label}] Total estimates: ${
      results.length
    }, mean difference: ${summary.mean.toFixed(
      2,
    )}%, median difference: ${summary.median.toFixed(
      2,
    )}%, max difference: ${summary.max.deltaPercentage!.toFixed(2)}%`,
  );
}

describe("ArbitrumPVG", () => {
  expect(transactions.length).toBeGreaterThan(0); // sanity check

  const CHAIN_ID = 42161; // Arbitrum One
  const MEAN_ERROR_TRESHOLD = 5; // 5% error threshold

  it("should match the results from arbitrum.json", () => {
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
