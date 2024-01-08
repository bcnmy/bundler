export interface EstimationResult {
  txHash: string;
  actual: BigInt;
  estimated: BigInt;
  delta: BigInt;
  deltaPercentage: number;
}

export interface ErrorRate {
  mean: number;
  median: number;
  max: EstimationResult;
}

export function summarizeResults(results: EstimationResult[]): ErrorRate {
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
