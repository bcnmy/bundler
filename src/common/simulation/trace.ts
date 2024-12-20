import { Address, Hex } from "viem";

export interface CallTracerResult {
  from: Address;
  gas: Hex;
  gasUsed: Hex;
  to: Address;
  input: Hex;
  output: Hex;
  value: Hex;
  type: string;
  error: string;
}

export interface TraceCall {
  from: string;
  gas: string;
  gasUsed: string;
  to: string;
  input: string;
  output?: string;
  error?: string;
  calls?: TraceCall[];
  value?: string;
  type: string;
}

/**
 * Recursively checks if any nested call contains errors and returns all errors.
 * @param trace The top-level trace call object.
 * @returns An array of errors (if found)
 */
export function findErrorsInTrace(
  trace: TraceCall,
  errors: string[],
): string[] {
  if (trace.error) {
    errors.push(trace.error);
  }

  // If there are nested calls, check them recursively
  if (trace.calls && trace.calls.length > 0) {
    for (const nestedCall of trace.calls) {
      findErrorsInTrace(nestedCall, errors);
    }
  }

  return errors;
}
