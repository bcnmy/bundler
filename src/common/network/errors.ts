/* eslint-disable max-classes-per-file */
import { parseError } from "../utils";

export class ErrorCheckingTransactionReceipt extends Error {
  constructor(
    error: any,
    public transactionHash: string,
    public transactionId: string,
    public chainId: number,
  ) {
    super(
      `Error checking transaction receipt: ${parseError(
        error,
      )} for transactionHash: ${transactionHash} on transactionId: ${transactionId} on chainId: ${chainId}`,
    );
  }
}
